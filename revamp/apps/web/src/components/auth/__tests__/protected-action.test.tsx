import { render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';

import { ProtectedAction } from '../protected-action';

const mockUser = vi.fn();
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: mockUser(), status: 'authenticated', refresh: vi.fn(), logout: vi.fn() }),
}));

function withPermissions(permissions: string[]): void {
  mockUser.mockReturnValue({
    userId: 1,
    username: 'u',
    name: 'U',
    roleId: 1,
    roleName: 'R',
    permissions,
    mustChangePassword: false,
  });
}

describe('ProtectedAction', () => {
  it('renders children when the permission is held', () => {
    withPermissions(['vehicle:create']);
    render(
      <ProtectedAction permission="vehicle:create">
        <button>Buat</button>
      </ProtectedAction>,
    );
    expect(screen.getByRole('button', { name: 'Buat' })).toBeInTheDocument();
  });

  it('renders the fallback when the permission is missing', () => {
    withPermissions(['vehicle:read']);
    render(
      <ProtectedAction permission="vehicle:create" fallback={<span>nope</span>}>
        <button>Buat</button>
      </ProtectedAction>,
    );
    expect(screen.queryByRole('button', { name: 'Buat' })).not.toBeInTheDocument();
    expect(screen.getByText('nope')).toBeInTheDocument();
  });

  it('honours OR semantics across multiple keys', () => {
    withPermissions(['driver:read']);
    render(
      <ProtectedAction permission={['vehicle:read', 'driver:read']}>
        <span>ok</span>
      </ProtectedAction>,
    );
    expect(screen.getByText('ok')).toBeInTheDocument();
  });

  it('honours requireAll', () => {
    withPermissions(['vehicle:read']);
    render(
      <ProtectedAction permission={['vehicle:read', 'driver:read']} requireAll>
        <span>both</span>
      </ProtectedAction>,
    );
    expect(screen.queryByText('both')).not.toBeInTheDocument();
  });

  it('lets a superuser wildcard through', () => {
    withPermissions(['*:*']);
    render(
      <ProtectedAction permission="anything:here">
        <span>super</span>
      </ProtectedAction>,
    );
    expect(screen.getByText('super')).toBeInTheDocument();
  });
});
