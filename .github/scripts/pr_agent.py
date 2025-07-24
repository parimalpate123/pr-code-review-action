import os
import json
import boto3
import requests
from github import Github
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

class GitHubActionsPRAgent:
    def __init__(self):
        self.github_token = os.environ['GITHUB_TOKEN']
        self.pr_number = int(os.environ['PR_NUMBER'])
        self.repo_owner = os.environ['REPO_OWNER']
        self.repo_name = os.environ['REPO_NAME']
        
        self.github = Github(self.github_token)
        self.repo = self.github.get_repo(f"{self.repo_owner}/{self.repo_name}")
        self.bedrock = boto3.client('bedrock-runtime')
        
    def analyze_pr(self):
        """Main analysis function for GitHub Actions"""
        try:
            pr = self.repo.get_pull(self.pr_number)
            
            # Get changed files
            files = list(pr.get_files())
            
            # Prepare analysis payload
            analysis_data = {
                'pr_title': pr.title,
                'pr_body': pr.body or '',
                'author': pr.user.login,
                'files_changed': len(files),
                'additions': pr.additions,
                'deletions': pr.deletions,
                'files': []
            }
            
            for file in files[:20]:  # Limit files
                file_data = {
                    'filename': file.filename,
                    'status': file.status,
                    'additions': file.additions,
                    'deletions': file.deletions,
                    'patch': file.patch[:3000] if file.patch else ''
                }
                analysis_data['files'].append(file_data)
            
            # Analyze with Claude
            review = self.get_claude_review(analysis_data)
            
            # Post review
            self.post_review(pr, review)
            
            # Set GitHub outputs
            self.set_github_output('review_posted', 'true')
            self.set_github_output('approval_status', review.get('approval_status', 'comment'))
            
        except Exception as e:
            logger.error(f"Error in PR analysis: {e}")
            self.set_github_output('review_posted', 'false')
            self.set_github_output('error', str(e))
    
    def get_claude_review(self, analysis_data):
        """Get review from Claude Sonnet"""
        prompt = self.build_review_prompt(analysis_data)
        
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 4000,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3
        }
        
        response = self.bedrock.invoke_model(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            body=json.dumps(body),
            contentType="application/json"
        )
        
        result = json.loads(response['body'].read())
        claude_response = result['content'][0]['text']
        
        try:
            return json.loads(claude_response)
        except:
            return {"review": claude_response, "approval_status": "comment"}
    
    def build_review_prompt(self, data):
        """Build comprehensive review prompt"""
        files_summary = "\n".join([
            f"File: {f['filename']} ({f['status']}) +{f['additions']} -{f['deletions']}\n"
            f"Changes:\n{f['patch'][:1000]}\n---"
            for f in data['files']
        ])
        
        return f"""
As a senior software engineer, review this GitHub PR:

**PR Details:**
- Title: {data['pr_title']}
- Author: {data['author']}
- Description: {data['pr_body']}
- Files Changed: {data['files_changed']}
- Lines: +{data['additions']} -{data['deletions']}

**Changed Files:**
{files_summary}

Provide a comprehensive review focusing on:
1. Code quality and best practices
2. Security vulnerabilities
3. Performance implications
4. Architecture and design
5. Testing coverage
6. Documentation needs

Return JSON with keys: overall_assessment, code_quality, security_concerns, 
performance_impact, suggestions, approval_status (approve/request_changes/comment)
"""
    
    def post_review(self, pr, review):
        """Post formatted review to PR"""
        comment = self.format_review_comment(review)
        
        if review.get('approval_status') == 'approve':
            pr.create_review(body=comment, event='APPROVE')
        elif review.get('approval_status') == 'request_changes':
            pr.create_review(body=comment, event='REQUEST_CHANGES')
        else:
            pr.create_review(body=comment, event='COMMENT')
    
    def format_review_comment(self, review):
        """Format review for GitHub"""
        sections = []
        
        if 'overall_assessment' in review:
            sections.append(f"## 📋 Overall Assessment\n{review['overall_assessment']}")
        
        if 'code_quality' in review:
            sections.append(f"## ✨ Code Quality\n{review['code_quality']}")
        
        if 'security_concerns' in review:
            sections.append(f"## 🔒 Security Analysis\n{review['security_concerns']}")
        
        if 'performance_impact' in review:
            sections.append(f"## ⚡ Performance Impact\n{review['performance_impact']}")
        
        if 'suggestions' in review:
            sections.append(f"## 💡 Recommendations\n{review['suggestions']}")
        
        comment = "\n\n".join(sections)
        comment += "\n\n---\n*🤖 AI Review by Claude Sonnet via GitHub Actions*"
        
        return comment
    
    def set_github_output(self, key, value):
        """Set GitHub Actions output"""
        with open(os.environ['GITHUB_OUTPUT'], 'a') as f:
            f.write(f"{key}={value}\n")

if __name__ == "__main__":
    agent = GitHubActionsPRAgent()
    agent.analyze_pr()