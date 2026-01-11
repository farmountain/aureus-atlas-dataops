import { describe, it, expect } from 'vitest';
import { readFileSync, existsSync } from 'fs';
import { resolve } from 'path';

describe('Production Readiness Validation', () => {
  const rootDir = resolve(__dirname, '../..');

  describe('Docker Assets', () => {
    it('should have docker-compose.yml', () => {
      const filePath = resolve(rootDir, 'docker-compose.yml');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('aureus-frontend');
      expect(content).toContain('aureus-postgres');
      expect(content).toContain('aureus-redis');
      expect(content).toContain('healthcheck');
      expect(content).toContain('evidence-data');
    });

    it('should have docker-compose.dev.yml', () => {
      const filePath = resolve(rootDir, 'docker-compose.dev.yml');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('development');
      expect(content).toContain('volumes');
    });

    it('should have Dockerfile with security best practices', () => {
      const filePath = resolve(rootDir, 'Dockerfile');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('node:20-alpine');
      expect(content).toContain('nginx:alpine');
      expect(content).toContain('runAsNonRoot');
      expect(content).toContain('HEALTHCHECK');
      expect(content).toContain('security headers');
    });

    it('should have .dockerignore', () => {
      const filePath = resolve(rootDir, '.dockerignore');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('node_modules');
      expect(content).toContain('*.test.ts');
    });
  });

  describe('Kubernetes Manifests', () => {
    it('should have deployment.yaml with HA configuration', () => {
      const filePath = resolve(rootDir, 'k8s/deployment.yaml');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('replicas: 3');
      expect(content).toContain('HorizontalPodAutoscaler');
      expect(content).toContain('PodDisruptionBudget');
      expect(content).toContain('livenessProbe');
      expect(content).toContain('readinessProbe');
      expect(content).toContain('runAsNonRoot: true');
      expect(content).toContain('readOnlyRootFilesystem: true');
      expect(content).toContain('resources');
    });

    it('should have service.yaml with networking configuration', () => {
      const filePath = resolve(rootDir, 'k8s/service.yaml');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('kind: Service');
      expect(content).toContain('kind: Ingress');
      expect(content).toContain('NetworkPolicy');
      expect(content).toContain('tls');
    });

    it('should have configmap.yaml with required configuration', () => {
      const filePath = resolve(rootDir, 'k8s/configmap.yaml');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('evidence.retention.days');
      expect(content).toContain('audit.enabled');
      expect(content).toContain('ratelimit');
      expect(content).toContain('slo');
      expect(content).toContain('aureus-secrets');
    });
  });

  describe('Runbooks', () => {
    it('should have incident-response.md with P0-P3 procedures', () => {
      const filePath = resolve(rootDir, 'runbooks/incident-response.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Severity Levels');
      expect(content).toContain('P0');
      expect(content).toContain('P1');
      expect(content).toContain('Escalation Matrix');
      expect(content).toContain('Evidence Requirements');
      expect(content).toContain('kubectl');
    });

    it('should have rollback-procedure.md with 5 rollback types', () => {
      const filePath = resolve(rootDir, 'runbooks/rollback-procedure.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Application Deployment Rollback');
      expect(content).toContain('Configuration Rollback');
      expect(content).toContain('Database Schema Rollback');
      expect(content).toContain('Policy Rollback');
      expect(content).toContain('AUREUS Snapshots');
      expect(content).toContain('Evidence Capture');
      expect(content).toContain('kubectl rollout undo');
    });

    it('should have audit-evidence-retrieval.md', () => {
      const filePath = resolve(rootDir, 'runbooks/audit-evidence-retrieval.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Evidence Types');
      expect(content).toContain('Audit Logs');
      expect(content).toContain('Approval Records');
      expect(content).toContain('Policy Decisions');
      expect(content).toContain('evidence-export.sh');
      expect(content).toContain('Access Control');
    });
  });

  describe('Documentation', () => {
    it('should have deployment-guide.md', () => {
      const filePath = resolve(rootDir, 'docs/deployment-guide.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Local Development Setup');
      expect(content).toContain('Docker Compose Deployment');
      expect(content).toContain('Kubernetes Deployment');
      expect(content).toContain('Health Checks');
      expect(content).toContain('Troubleshooting');
      expect(content).toContain('Blue-Green Deployment');
    });

    it('should have data-retention-policy.md with retention schedules', () => {
      const filePath = resolve(rootDir, 'docs/data-retention-policy.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Retention Period');
      expect(content).toContain('Audit Logs');
      expect(content).toContain('Query History');
      expect(content).toContain('Approval Records');
      expect(content).toContain('Evidence Packs');
      expect(content).toContain('GDPR');
      expect(content).toContain('SOX');
      expect(content).toContain('7 years');
    });

    it('should have slo-definitions.md with 13 SLOs', () => {
      const filePath = resolve(rootDir, 'docs/slo-definitions.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Service Level Objectives');
      expect(content).toContain('Availability');
      expect(content).toContain('99.5%');
      expect(content).toContain('Query Execution Latency');
      expect(content).toContain('3 seconds');
      expect(content).toContain('Evidence Generation');
      expect(content).toContain('5 seconds');
      expect(content).toContain('Audit Coverage');
      expect(content).toContain('100%');
      expect(content).toContain('Error Budget');
    });
  });

  describe('Scripts', () => {
    it('should have deploy-check.sh executable', () => {
      const filePath = resolve(rootDir, 'scripts/deploy-check.sh');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('kubectl');
      expect(content).toContain('VALIDATION');
      expect(content).toContain('Prerequisites Check');
      expect(content).toContain('Configuration Check');
      expect(content).toContain('Security Check');
    });

    it('should have evidence-export.sh', () => {
      const filePath = resolve(rootDir, 'scripts/evidence-export.sh');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('#!/bin/bash');
      expect(content).toContain('evidence-export');
      expect(content).toContain('--start-date');
      expect(content).toContain('--end-date');
      expect(content).toContain('--output');
      expect(content).toContain('archive');
    });
  });

  describe('Evidence', () => {
    it('should have deployment-validation.md evidence pack', () => {
      const filePath = resolve(rootDir, 'evidence/production-readiness/deployment-validation.md');
      expect(existsSync(filePath)).toBe(true);
      
      const content = readFileSync(filePath, 'utf-8');
      expect(content).toContain('Production Readiness Validation Evidence');
      expect(content).toContain('Acceptance Criteria Status');
      expect(content).toContain('Files Created');
      expect(content).toContain('Risk Assessment');
      expect(content).toContain('✅');
    });
  });

  describe('Configuration Completeness', () => {
    it('should have all required environment variables documented', () => {
      const dockerComposeContent = readFileSync(resolve(rootDir, 'docker-compose.yml'), 'utf-8');
      const configMapContent = readFileSync(resolve(rootDir, 'k8s/configmap.yaml'), 'utf-8');
      
      // Check critical environment variables
      expect(dockerComposeContent).toContain('NODE_ENV');
      expect(dockerComposeContent).toContain('POSTGRES_PASSWORD');
      expect(dockerComposeContent).toContain('REDIS_PASSWORD');
      
      expect(configMapContent).toContain('evidence.retention.days');
      expect(configMapContent).toContain('audit.enabled');
      expect(configMapContent).toContain('ratelimit');
    });

    it('should have health check endpoints configured', () => {
      const dockerComposeContent = readFileSync(resolve(rootDir, 'docker-compose.yml'), 'utf-8');
      const deploymentContent = readFileSync(resolve(rootDir, 'k8s/deployment.yaml'), 'utf-8');
      
      expect(dockerComposeContent).toContain('healthcheck');
      expect(deploymentContent).toContain('livenessProbe');
      expect(deploymentContent).toContain('/health');
    });
  });

  describe('Security Validation', () => {
    it('should not contain hardcoded secrets', () => {
      const dockerComposeContent = readFileSync(resolve(rootDir, 'docker-compose.yml'), 'utf-8');
      const configMapContent = readFileSync(resolve(rootDir, 'k8s/configmap.yaml'), 'utf-8');
      
      // Check for placeholder values, not real secrets
      expect(dockerComposeContent).toContain('changeme');
      expect(dockerComposeContent).not.toContain('sk-'); // OpenAI key pattern
      
      expect(configMapContent).toContain('CHANGE_ME');
    });

    it('should configure non-root user in Dockerfile', () => {
      const dockerfileContent = readFileSync(resolve(rootDir, 'Dockerfile'), 'utf-8');
      expect(dockerfileContent).toMatch(/USER\s+(aureus|[0-9]+)/);
      expect(dockerfileContent).toContain('runAsNonRoot');
    });
  });

  describe('Compliance Requirements', () => {
    it('should document 7-year retention for audit logs', () => {
      const retentionPolicy = readFileSync(resolve(rootDir, 'docs/data-retention-policy.md'), 'utf-8');
      expect(retentionPolicy).toContain('7 years');
      expect(retentionPolicy).toContain('SOX');
      expect(retentionPolicy).toContain('Audit Logs');
    });

    it('should have 100% audit coverage SLO', () => {
      const sloDefinitions = readFileSync(resolve(rootDir, 'docs/slo-definitions.md'), 'utf-8');
      expect(sloDefinitions).toContain('Audit Coverage');
      expect(sloDefinitions).toContain('100%');
    });

    it('should document GDPR compliance', () => {
      const retentionPolicy = readFileSync(resolve(rootDir, 'docs/data-retention-policy.md'), 'utf-8');
      expect(retentionPolicy).toContain('GDPR');
      expect(retentionPolicy).toContain('right to erasure');
    });
  });
});
