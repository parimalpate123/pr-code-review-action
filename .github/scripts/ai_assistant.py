import os
import re
import json
import boto3
from github import Github

class AIAssistant:
    def __init__(self):
        self.github = Github(os.environ['GITHUB_TOKEN'])
        self.bedrock = boto3.client('bedrock-runtime')
        self.comment_body = os.environ['COMMENT_BODY']
        self.pr_number = int(os.environ['PR_NUMBER'])
        self.repo = self.github.get_repo(os.environ['GITHUB_REPOSITORY'])
        
    def process_request(self):
        """Process AI assistant request from comment"""
        # Extract command from comment
        command = self.extract_command()
        
        if command == 'explain':
            self.explain_changes()
        elif command == 'review':
            self.review_specific_files()
        elif command == 'suggest':
            self.suggest_improvements()
        elif command == 'test':
            self.suggest_tests()
        elif command == 'security':
            self.security_analysis()
        else:
            self.general_assistance()
    
    def extract_command(self):
        """Extract command from comment"""
        patterns = {
            'explain': r'/claude explain|@ai-assistant explain',
            'review': r'/claude review|@ai-assistant review',
            'suggest': r'/claude suggest|@ai-assistant suggest',
            'test': r'/claude test|@ai-assistant test',
            'security': r'/claude security|@ai-assistant security'
        }
        
        for command, pattern in patterns.items():
            if re.search(pattern, self.comment_body, re.IGNORECASE):
                return command
        return 'general'
    
    def get_claude_response(self, prompt):
        """Get response from Claude"""
        body = {
            "anthropic_version": "bedrock-2023-05-31",
            "max_tokens": 2000,
            "messages": [{"role": "user", "content": prompt}],
            "temperature": 0.3
        }
        
        response = self.bedrock.invoke_model(
            modelId="anthropic.claude-3-sonnet-20240229-v1:0",
            body=json.dumps(body),
            contentType="application/json"
        )
        
        result = json.loads(response['body'].read())
        return result['content'][0]['text']
    
    def explain_changes(self):
        """Explain PR changes"""
        pr = self.repo.get_pull(self.pr_number)
        files = list(pr.get_files())
        
        files_info = "\n".join([
            f"- {f.filename}: +{f.additions} -{f.deletions}"
            for f in files[:10]
        ])
        
        prompt = f"""
Explain the changes in this PR in simple terms:

PR Title: {pr.title}
Files changed:
{files_info}

Provide a clear, non-technical explanation of what this PR does.
"""
        
        response = self.get_claude_response(prompt)
        self.post_comment(f"## 📖 Change Explanation\n\n{response}")
    
    def suggest_tests(self):
        """Suggest test cases"""
        pr = self.repo.get_pull(self.pr_number)
        files = [f for f in pr.get_files() if f.filename.endswith(('.py', '.js', '.ts', '.java'))]
        
        code_changes = "\n".join([
            f"File: {f.filename}\n{f.patch[:1000]}"
            for f in files[:5]
        ])
        
        prompt = f"""
Based on these code changes, suggest comprehensive test cases:

{code_changes}

Provide specific test scenarios including:
1. Unit tests
2. Integration tests
3. Edge cases
4. Error conditions
"""
        
        response = self.get_claude_response(prompt)
        self.post_comment(f"## 🧪 Suggested Test Cases\n\n{response}")
    
    def post_comment(self, content):
        """Post comment to PR"""
        pr = self.repo.get_pull(self.pr_number)
        pr.create_issue_comment(content)

if __name__ == "__main__":
    assistant = AIAssistant()
    assistant.process_request()
