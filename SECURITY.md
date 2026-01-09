Thanks for helping make GitHub safe for everyone.

# Security

GitHub takes the security of our software products and services seriously, including all of the open source code repositories managed through our GitHub organizations, such as [GitHub](https://github.com/GitHub).

Even though [open source repositories are outside of the scope of our bug bounty program](https://bounty.github.com/index.html#scope) and therefore not eligible for bounty rewards, we will ensure that your finding gets passed along to the appropriate maintainers for remediation. 

## Reporting Security Issues

If you believe you have found a security vulnerability in any GitHub-owned repository, please report it to us through coordinated disclosure.

**Please do not report security vulnerabilities through public GitHub issues, discussions, or pull requests.**

Instead, please send an email to opensource-security[@]github.com.

Please include as much of the information listed below as you can to help us better understand and resolve the issue:

  * The type of issue (e.g., buffer overflow, SQL injection, or cross-site scripting)
  * Full paths of source file(s) related to the manifestation of the issue
  * The location of the affected source code (tag/branch/commit or direct URL)
  * Any special configuration required to reproduce the issue
  * Step-by-step instructions to reproduce the issue
  * Proof-of-concept or exploit code (if possible)
  * Impact of the issue, including how an attacker might exploit the issue

This information will help us triage your report more quickly.

## Policy

See [GitHub's Safe Harbor Policy](https://docs.github.com/en/site-policy/security-policies/github-bug-bounty-program-legal-safe-harbor#1-safe-harbor-terms)

---

# AUREUS Platform Security Guidelines

## Secrets Management for Production

### Overview

The AUREUS platform requires secure management of sensitive credentials, API keys, and encryption keys. This document provides production-ready guidance for secrets management.

### Principles

1. **Never commit secrets to version control**
2. **Use dedicated secrets management services**
3. **Rotate secrets regularly**
4. **Apply principle of least privilege**
5. **Audit all secret access**

### Secrets Inventory

| Secret Type | Purpose | Rotation Frequency | Storage Location |
|-------------|---------|-------------------|------------------|
| Database credentials | Postgres connection | 90 days | Vault/Secrets Manager |
| LLM API keys | OpenAI/Azure API access | 30 days | Vault/Secrets Manager |
| JWT signing keys | Token authentication | 180 days | HSM/Vault |
| Encryption keys (at-rest) | Data encryption | 365 days | KMS |
| Service account keys | Inter-service auth | 90 days | Vault/Secrets Manager |
| Audit log signing keys | Log integrity | 365 days | HSM |
| TLS certificates | HTTPS encryption | Per CA policy | Certificate Manager |

### Production Secrets Management Solutions

#### Recommended: HashiCorp Vault

```bash
# Initialize Vault
vault operator init
vault operator unseal

# Enable secrets engine
vault secrets enable -path=aureus kv-v2

# Store database credentials
vault kv put aureus/prod/database \
  username="aureus_prod" \
  password="<generated-password>" \
  host="prod-db.internal" \
  port="5432"

# Store LLM API keys
vault kv put aureus/prod/llm \
  openai_api_key="<api-key>" \
  azure_api_key="<api-key>"

# Create policy for application access
vault policy write aureus-prod - <<EOF
path "aureus/data/prod/*" {
  capabilities = ["read"]
}
EOF

# Enable AppRole authentication
vault auth enable approle
vault write auth/approle/role/aureus-prod \
  token_policies="aureus-prod" \
  token_ttl=1h \
  token_max_ttl=4h
```

#### Alternative: AWS Secrets Manager

```python
import boto3
from botocore.exceptions import ClientError

def get_secret(secret_name: str, region: str = 'us-east-1') -> dict:
    """Retrieve secret from AWS Secrets Manager"""
    client = boto3.client('secretsmanager', region_name=region)
    
    try:
        response = client.get_secret_value(SecretId=secret_name)
        return json.loads(response['SecretString'])
    except ClientError as e:
        logger.error(f"Failed to retrieve secret: {e}")
        raise

# Store database credentials
aws secretsmanager create-secret \
  --name aureus/prod/database \
  --secret-string '{"username":"aureus_prod","password":"<password>","host":"prod-db.rds.amazonaws.com","port":"5432"}'

# Enable automatic rotation
aws secretsmanager rotate-secret \
  --secret-id aureus/prod/database \
  --rotation-lambda-arn arn:aws:lambda:region:account:function:rotator \
  --rotation-rules AutomaticallyAfterDays=90
```

#### Alternative: Azure Key Vault

```bash
# Create Key Vault
az keyvault create \
  --name aureus-prod-vault \
  --resource-group aureus-prod \
  --location eastus

# Store secrets
az keyvault secret set \
  --vault-name aureus-prod-vault \
  --name database-password \
  --value "<password>"

# Grant application access
az keyvault set-policy \
  --name aureus-prod-vault \
  --object-id <app-object-id> \
  --secret-permissions get list
```

### Application Integration

#### Environment Variables (Development Only)

```bash
# .env.local (NEVER commit this file)
DATABASE_URL=postgresql://user:pass@localhost:5432/aureus
LLM_API_KEY=sk-...
JWT_SECRET=<random-256-bit-key>
```

#### Production Configuration

```python
# config/secrets.py
import hvac
import os
from typing import Dict, Any

class SecretsManager:
    def __init__(self):
        self.vault_url = os.environ['VAULT_ADDR']
        self.vault_token = os.environ['VAULT_TOKEN']  # From AppRole or K8s auth
        self.client = hvac.Client(url=self.vault_url, token=self.vault_token)
    
    def get_database_credentials(self) -> Dict[str, Any]:
        """Retrieve database credentials from Vault"""
        secret = self.client.secrets.kv.v2.read_secret_version(
            path='prod/database',
            mount_point='aureus'
        )
        return secret['data']['data']
    
    def get_llm_api_key(self) -> str:
        """Retrieve LLM API key from Vault"""
        secret = self.client.secrets.kv.v2.read_secret_version(
            path='prod/llm',
            mount_point='aureus'
        )
        return secret['data']['data']['openai_api_key']

# Usage
secrets = SecretsManager()
db_creds = secrets.get_database_credentials()
database_url = f"postgresql://{db_creds['username']}:{db_creds['password']}@{db_creds['host']}:{db_creds['port']}/aureus"
```

### Secret Rotation

#### Automated Rotation Strategy

1. **Database Credentials**: Use dual-password approach
   - Create new password
   - Update application configuration
   - Wait for connection pool refresh (5 minutes)
   - Revoke old password

2. **API Keys**: Implement gradual rollover
   - Generate new key
   - Configure both keys as valid (24-hour overlap)
   - Update application to use new key
   - Revoke old key after overlap period

3. **JWT Signing Keys**: Use key versioning
   - Generate new key with version N+1
   - Sign new tokens with new key
   - Verify tokens with both keys (grace period: 7 days)
   - Remove old key after grace period

#### Rotation Script Example

```python
# scripts/rotate_database_password.py
import hvac
import psycopg2
import secrets
import time

def rotate_database_password():
    vault = hvac.Client(url=VAULT_URL, token=VAULT_TOKEN)
    
    # Get current credentials
    current = vault.secrets.kv.v2.read_secret_version(
        path='prod/database',
        mount_point='aureus'
    )['data']['data']
    
    # Generate new password
    new_password = secrets.token_urlsafe(32)
    
    # Update database
    conn = psycopg2.connect(
        host=current['host'],
        database='postgres',
        user='admin',
        password=ADMIN_PASSWORD
    )
    cursor = conn.cursor()
    cursor.execute(f"ALTER USER {current['username']} WITH PASSWORD %s", (new_password,))
    conn.commit()
    conn.close()
    
    # Update Vault
    vault.secrets.kv.v2.create_or_update_secret(
        path='prod/database',
        secret=dict(
            username=current['username'],
            password=new_password,
            host=current['host'],
            port=current['port']
        ),
        mount_point='aureus'
    )
    
    print(f"Password rotated successfully. Waiting for application refresh...")
    time.sleep(300)  # 5-minute grace period
    
    return True
```

### Access Control

#### Principle of Least Privilege

```hcl
# Vault policy: aureus-prod-readonly
path "aureus/data/prod/database" {
  capabilities = ["read"]
}

path "aureus/data/prod/llm" {
  capabilities = ["read"]
}

# Vault policy: aureus-prod-admin
path "aureus/data/prod/*" {
  capabilities = ["create", "read", "update", "delete", "list"]
}

path "aureus/metadata/prod/*" {
  capabilities = ["read", "list"]
}
```

#### Role-Based Access

| Role | Secrets Access | Rationale |
|------|----------------|-----------|
| Application (prod) | Read-only database, LLM API keys | Runtime operation |
| Application (dev) | Read-only dev secrets | Development testing |
| DevOps | Read/write all secrets | Deployment, rotation |
| Security Team | Read all, audit logs | Security monitoring |
| Developers | No direct access | Use dev environment |

### Encryption at Rest

```python
# Using AWS KMS for encryption keys
import boto3
from cryptography.fernet import Fernet

class EncryptionService:
    def __init__(self):
        self.kms = boto3.client('kms')
        self.key_id = 'arn:aws:kms:region:account:key/key-id'
    
    def get_data_key(self) -> bytes:
        """Get data encryption key from KMS"""
        response = self.kms.generate_data_key(
            KeyId=self.key_id,
            KeySpec='AES_256'
        )
        return response['Plaintext']
    
    def encrypt_field(self, plaintext: str) -> str:
        """Encrypt PII field"""
        data_key = self.get_data_key()
        f = Fernet(base64.urlsafe_b64encode(data_key))
        return f.encrypt(plaintext.encode()).decode()
```

### Audit and Monitoring

#### Secret Access Logging

```python
# Enable Vault audit logging
vault audit enable file file_path=/var/log/vault/audit.log

# Monitor secret access
import json
from datetime import datetime

def audit_secret_access(log_file: str):
    """Parse and alert on suspicious secret access"""
    with open(log_file) as f:
        for line in f:
            event = json.loads(line)
            if event['type'] == 'response':
                if event['auth']['metadata']['role'] != 'aureus-prod':
                    alert(f"Unexpected secret access from {event['auth']['metadata']['role']}")
```

#### Alerting Rules

- Secret accessed from unexpected IP
- Secret accessed outside business hours
- Multiple failed secret retrieval attempts
- Secret accessed by revoked token
- Secret rotation overdue

### Compliance Requirements

#### SOC 2 / ISO 27001

- ✅ Secrets stored in dedicated vault
- ✅ Access logs retained for 7 years
- ✅ Secrets rotated per schedule
- ✅ Access reviews quarterly
- ✅ Encryption in transit and at rest

#### PCI DSS

- ✅ Cardholder data encryption keys in HSM
- ✅ Dual control for key management
- ✅ Key rotation annually
- ✅ Cryptographic key management policy

### Incident Response

#### Suspected Secret Compromise

1. **Immediate**: Rotate compromised secret
2. **Immediate**: Revoke all active tokens/sessions
3. **1 hour**: Audit access logs for unauthorized use
4. **4 hours**: Identify scope of compromise
5. **24 hours**: Complete incident report
6. **7 days**: Implement additional controls

### Development Best Practices

#### DO

✅ Use secrets manager SDK in application code  
✅ Load secrets at application startup  
✅ Cache secrets in memory (refresh every 1 hour)  
✅ Use separate secrets for dev/uat/prod  
✅ Implement secret access retry logic with exponential backoff  
✅ Log secret access (not values) for audit  

#### DON'T

❌ Never log secret values  
❌ Never include secrets in error messages  
❌ Never commit secrets to git  
❌ Never share secrets via email/slack  
❌ Never hardcode secrets in source code  
❌ Never use production secrets in development  

### Testing Secrets Management

```python
# tests/test_secrets.py
import pytest
from unittest.mock import Mock, patch

def test_secrets_never_logged(caplog):
    """Ensure secrets are not logged"""
    with patch('config.secrets.SecretsManager.get_llm_api_key') as mock:
        mock.return_value = 'sk-secret-key-value'
        
        # Perform operation that uses secret
        service.execute_query()
        
        # Assert secret not in logs
        for record in caplog.records:
            assert 'sk-secret-key-value' not in record.message

def test_secret_rotation_graceful():
    """Test application handles secret rotation"""
    # Simulate credential refresh mid-request
    with patch('config.secrets.SecretsManager.get_database_credentials') as mock:
        mock.side_effect = [
            {'password': 'old-password'},
            {'password': 'new-password'}
        ]
        
        # Should retry with new credentials
        result = database.query("SELECT 1")
        assert result is not None
```

### Additional Resources

- [OWASP Secrets Management Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Secrets_Management_Cheat_Sheet.html)
- [HashiCorp Vault Best Practices](https://developer.hashicorp.com/vault/tutorials/operations/production-hardening)
- [AWS Secrets Manager Best Practices](https://docs.aws.amazon.com/secretsmanager/latest/userguide/best-practices.html)
- [NIST SP 800-57: Key Management](https://csrc.nist.gov/publications/detail/sp/800-57-part-1/rev-5/final)
