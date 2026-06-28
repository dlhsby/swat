import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { NextIntlClientProvider } from 'next-intl';
import { type ReactElement } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import type * as UiModule from '@/components/ui';
import messages from '@/messages/id-ID.json';

import RolesPage from '../page';

const rolesApi = {
  list: vi.fn(),
  get: vi.fn(),
  create: vi.fn(),
  update: vi.fn(),
  remove: vi.fn(),
};
const permissionsApi = { list: vi.fn() };

vi.mock('@/lib/roles-api', () => ({
  get rolesApi() {
    return rolesApi;
  },
  get permissionsApi() {
    return permissionsApi;
  },
}));

const mockUser = vi.fn();
vi.mock('@/providers/auth-provider', () => ({
  useAuth: () => ({ user: mockUser(), status: 'authenticated', refresh: vi.fn(), logout: vi.fn() }),
}));

vi.mock('@/components/ui', async (importOriginal) => ({
  ...(await importOriginal<typeof UiModule>()),
  notify: { success: vi.fn(), error: vi.fn() },
}));

const PERMISSIONS = [
  { id: 'p1', key: 'vehicle:read', description: 'Permission to view vehicle', group: 'vehicle' },
  {
    id: 'p2',
    key: 'vehicle:create',
    description: 'Permission to create vehicle',
    group: 'vehicle',
  },
  { id: 'p3', key: 'driver:read', description: 'Permission to view driver', group: 'driver' },
];
const ROLE = {
  id: 'r1',
  name: 'Operator',
  permissionIds: ['p1'],
  userCount: 0,
  createdAt: '',
  updatedAt: '',
};

function renderPage(): ReactElement {
  return (
    <NextIntlClientProvider locale="id-ID" messages={messages} timeZone="Asia/Jakarta">
      <RolesPage />
    </NextIntlClientProvider>
  );
}

describe('RolesPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUser.mockReturnValue({ permissions: ['*:*'], roleName: 'Admin' });
    rolesApi.list.mockResolvedValue([ROLE]);
    rolesApi.get.mockResolvedValue({ ...ROLE, permissions: PERMISSIONS, permissionIds: ['p1'] });
    rolesApi.create.mockResolvedValue({ ...ROLE, id: 'r2', name: 'Baru', permissionIds: [] });
    rolesApi.update.mockResolvedValue(ROLE);
    rolesApi.remove.mockResolvedValue({ message: 'ok' });
    permissionsApi.list.mockResolvedValue(PERMISSIONS);
  });

  it('opens the create-role dialog and submits a new role', async () => {
    render(renderPage());
    await userEvent.click(await screen.findByRole('button', { name: /Tambah Peran/ }));

    const dialog = await screen.findByRole('dialog');
    await userEvent.type(within(dialog).getByLabelText(/Nama Peran/), 'Baru');
    await userEvent.click(within(dialog).getByRole('button', { name: 'Simpan' }));

    await waitFor(() =>
      expect(rolesApi.create).toHaveBeenCalledWith({ name: 'Baru', permissionIds: [] }),
    );
  });

  it('groups permissions by functional category, in Indonesian, with select-all', async () => {
    render(renderPage());
    // Master Data category header (open by default) shows the overall count (1 of 3).
    const masterHeader = await screen.findByRole('button', { name: /Master Data/i });
    expect(within(masterHeader).getByText('1/3')).toBeInTheDocument();

    // Permissions render with Indonesian labels, not the English DB description.
    expect(screen.getByText('Lihat Kendaraan')).toBeInTheDocument();
    expect(screen.queryByText('Permission to view vehicle')).toBeNull();

    // Select-all for the Kendaraan (vehicle) sub-group flips both vehicle perms on
    // → the Master Data category count rises 1/3 → 2/3.
    await userEvent.click(screen.getByRole('checkbox', { name: 'Pilih semua izin Kendaraan' }));
    await waitFor(() => expect(within(masterHeader).getByText('2/3')).toBeInTheDocument());
  });

  it('deletes the selected role after confirmation', async () => {
    render(renderPage());
    await userEvent.click(await screen.findByRole('button', { name: 'Hapus peran' }));
    const confirm = await screen.findByRole('alertdialog');
    await userEvent.click(within(confirm).getByRole('button', { name: 'Hapus' }));
    await waitFor(() => expect(rolesApi.remove).toHaveBeenCalledWith('r1'));
  });
});
