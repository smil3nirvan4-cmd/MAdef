import { describe, it, expect } from 'vitest';
import { resolveDatabaseTargetInfo } from '../database-target';

describe('resolveDatabaseTargetInfo', () => {
  it("returns 'unknown' provider for undefined input", () => {
    const result = resolveDatabaseTargetInfo(undefined);
    expect(result.provider).toBe('unknown');
    expect(result.databaseUrl).toBe('');
    expect(result.safeUrl).toBe('');
    expect(result.target).toBe('DATABASE_URL nao definido');
  });

  it("returns 'unknown' provider for empty string input", () => {
    const result = resolveDatabaseTargetInfo('');
    expect(result.provider).toBe('unknown');
    expect(result.databaseUrl).toBe('');
    expect(result.safeUrl).toBe('');
    expect(result.target).toBe('DATABASE_URL nao definido');
  });

  it("detects postgresql provider from 'postgresql://' URL", () => {
    const result = resolveDatabaseTargetInfo('postgresql://user:pass@localhost:5432/mydb');
    expect(result.provider).toBe('postgresql');
  });

  it("detects postgresql provider from 'postgres://' URL", () => {
    const result = resolveDatabaseTargetInfo('postgres://user:pass@localhost:5432/mydb');
    expect(result.provider).toBe('postgresql');
  });

  it("detects sqlite provider from 'file:' URL", () => {
    const result = resolveDatabaseTargetInfo('file:./dev.db');
    expect(result.provider).toBe('sqlite');
  });

  it("detects mysql provider from 'mysql://' URL", () => {
    const result = resolveDatabaseTargetInfo('mysql://user:pass@localhost:3306/mydb');
    expect(result.provider).toBe('mysql');
  });

  it('masks password in postgres URL but preserves username', () => {
    const result = resolveDatabaseTargetInfo('postgresql://admin:secretpass@localhost:5432/mydb');
    expect(result.safeUrl).toContain('admin');
    expect(result.safeUrl).toContain('***');
    expect(result.safeUrl).not.toContain('secretpass');
  });

  it("resolves SQLite ':memory:' target", () => {
    const result = resolveDatabaseTargetInfo('file::memory:');
    expect(result.provider).toBe('sqlite');
    expect(result.target).toBe(':memory:');
  });

  it('resolves PostgreSQL target with host:port / dbname', () => {
    const result = resolveDatabaseTargetInfo('postgresql://user:pass@dbhost:5432/production');
    expect(result.target).toBe('dbhost:5432 / production');
  });

  it("returns 'unknown' provider for unrecognized URL schemes", () => {
    const result = resolveDatabaseTargetInfo('ftp://some-server/data');
    expect(result.provider).toBe('unknown');
  });

  it("returns 'unknown' provider for plain strings", () => {
    const result = resolveDatabaseTargetInfo('just-some-random-string');
    expect(result.provider).toBe('unknown');
  });
});
