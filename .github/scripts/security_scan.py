import os
import re
import json
import boto3
from pathlib import Path
from github import Github

class SecurityScanner:
    def __init__(self):
        self.github = Github(os.environ['GITHUB_TOKEN'])
        self.bedrock = boto3.client('bedrock-runtime')
        self.repo = self.github.get_repo(os.environ['GITHUB_REPOSITORY'])
        self.pr_number = int(os.environ['PR_NUMBER'])
        
    def scan_pr_security(self):
        """Comprehensive security scan of PR changes"""
        pr = self.repo.get_pull(self.pr_number)
        security_issues = []
        
        # Scan each changed file
        for file in pr.get_files():
            if self.is_scannable_file(file.filename):
                issues = self.scan_file_security(file)
                if issues:
                    security_issues.extend(issues)
        
        # Generate security report
        if security_issues:
            self.post_security_report(security_issues)
            self.set_security_check_failed()
        else:
            self.set_security_check_passed()
    
    def is_scannable_file(self, filename):
        """Check if file should be scanned for security"""
        scannable_extensions = ['.py', '.js', '.ts', '.java', '.go', '.rb', '.php', '.sql']
        return any(filename.endswith(ext) for ext in scannable_extensions)
    
    def scan_file_security(self, file):
        """Scan individual file for security issues"""
        # Basic pattern matching for common vulnerabilities
        patterns = {
            'sql_injection': r'(SELECT|INSERT|UPDATE|DELETE).*\+.*',
            'hardcoded_secrets': r'(password|secret|key|token)\s*=\s*["\'][^"\']+["\']',
            'command_injection': r'(exec|system|shell_exec|eval)\s*\(',
            'xss_vulnerability': r'innerHTML\s*=\s*.*user',
            'path_traversal': r'\.\./.*\.\.'
        }
        
        issues = []
        if file.patch:
            for vuln_type, pattern in patterns.items():
                matches = re.finditer(pattern, file.patch, re.IGNORECASE)
                for match in matches:
                    issues.append({
                        'file': file.filename,
                        'type': vuln_type,
                        'line': match.group(),
                        'severity': self.get_severity(vuln_type)
                    })
        
        # Use Claude for advanced analysis
        advanced_issues = self.claude_security_analysis(file)
        issues.extend(advanced_issues)
        
        return issues
    
    def claude_security_analysis(self, file):
        """Use Claude for advanced security analysis"""
        if not file.patch:
            return []
            
        prompt = f"""
Analyze this code change for security vulnerabilities:

File: {file.filename}
Changes:
{file.patch[:2000]}

Identify potential security issues including:
1. Injection vulnerabilities
2. Authentication/authorization flaws
3. Data exposure risks
4. Cryptographic issues
5. Input validation problems

Return JSON array with objects containing: type, description, severity (high/medium/low), line_reference
"""
        
        try:
            body = {
                "anthropic_version": "bedrock-2023-05-31",
                "max_tokens": 1500,
                "messages": [{"role": "user", "content": prompt}],
                "temperature": 0.1
            }
            
            response = self.bedrock.invoke_model(
                modelId="anthropic.claude-3-sonnet-20240229-v1:0",
                body=json.dumps(body),
                contentType="application/json"
            )
            
            result = json.loads(response['body'].read())
            claude_response = result['content'][0]['text']
            
            # Parse Claude's response
            security_issues = json.loads(claude_response)
            return [{
                'file': file.filename,
                'type': issue['type'],
                'description': issue['description'],
                'severity': issue['severity']
            } for issue in security_issues]
            
        except Exception as e:
            print(f"Claude analysis failed: {e}")
            return []
    
    def get_severity(self, vuln_type):
        """Map vulnerability type to severity"""
        high_severity = ['sql_injection', 'command_injection', 'hardcoded_secrets']
        return 'high' if vuln_type in high_severity else 'medium'
    
    def post_security_report(self, issues):
        """Post security report to PR"""
        high_issues = [i for i in issues if i['severity'] == 'high']
        medium_issues = [i for i in issues if i['severity'] == 'medium']
        low_issues = [i for i in issues if i['severity'] == 'low']
        
        report = "## 🔒 Security Scan Results\n\n"
        
        if high_issues:
            report += "### ⚠️ High Severity Issues\n"
            for issue in high_issues:
                report += f"- **{issue['type']}** in `{issue['file']}`\n"
                if 'description' in issue:
                    report += f"  {issue['description']}\n"
            report += "\n"
        
        if medium_issues:
            report += "### 🟡 Medium Severity Issues\n"
            for issue in medium_issues:
                report += f"- **{issue['type']}** in `{issue['file']}`\n"
                if 'description' in issue:
                    report += f"  {issue['description']}\n"
            report += "\n"
        
        if low_issues:
            report += "### ℹ️ Low Severity Issues\n"
            for issue in low_issues:
                report += f"- **{issue['type']}** in `{issue['file']}`\n"
            report += "\n"
        
        report += "---\n*🤖 Automated security scan by Claude Sonnet*"
        
        pr = self.repo.get_pull(self.pr_number)
        pr.create_issue_comment(report)
    
    def set_security_check_failed(self):
        """Set GitHub check status to failed"""
        with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
            f.write("security_status=failed\n")
    
    def set_security_check_passed(self):
        """Set GitHub check status to passed"""
        with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
            f.write("security_status=passed\n")

if __name__ == "__main__":
    scanner = SecurityScanner()
    scanner.scan_pr_security()
