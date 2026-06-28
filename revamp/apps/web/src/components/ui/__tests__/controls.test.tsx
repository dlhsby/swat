import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { describe, expect, it, vi } from 'vitest';

import { Checkbox } from '../checkbox';
import { Combobox } from '../combobox';
import { DatePicker } from '../date-picker';
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '../form';
import { Input } from '../input';
import { NumberInput } from '../number-input';
import { RadioGroup, RadioGroupItem } from '../radio-group';
import { Switch } from '../switch';
import { TimePicker } from '../time-picker';

describe('Checkbox', () => {
  it('toggles and reports checked state', async () => {
    const onChange = vi.fn();
    render(<Checkbox aria-label="pilih" onCheckedChange={onChange} />);
    await userEvent.click(screen.getByRole('checkbox', { name: 'pilih' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });

  it('renders the indeterminate indicator', () => {
    render(<Checkbox aria-label="semua" checked="indeterminate" />);
    expect(screen.getByRole('checkbox', { name: 'semua' })).toHaveAttribute(
      'data-state',
      'indeterminate',
    );
  });
});

describe('Switch', () => {
  it('flips on click', async () => {
    const onChange = vi.fn();
    render(<Switch aria-label="aktif" onCheckedChange={onChange} />);
    await userEvent.click(screen.getByRole('switch', { name: 'aktif' }));
    expect(onChange).toHaveBeenCalledWith(true);
  });
});

describe('RadioGroup', () => {
  it('selects one option per group', async () => {
    const onChange = vi.fn();
    render(
      <RadioGroup aria-label="tipe" onValueChange={onChange}>
        <RadioGroupItem value="a" aria-label="A" />
        <RadioGroupItem value="b" aria-label="B" />
      </RadioGroup>,
    );
    await userEvent.click(screen.getByRole('radio', { name: 'B' }));
    expect(onChange).toHaveBeenCalledWith('b');
  });
});

describe('NumberInput', () => {
  it('renders a plain numeric input with a unit suffix', () => {
    render(<NumberInput aria-label="jarak" unit="km" value={12} readOnly />);
    expect(screen.getByLabelText('jarak')).toHaveValue(12);
    expect(screen.getByText('km')).toBeInTheDocument();
  });

  it('steppers bump within min/max bounds', async () => {
    const onValueChange = vi.fn();
    render(
      <NumberInput
        aria-label="qty"
        steppers
        value={9}
        max={10}
        step={1}
        onValueChange={onValueChange}
        readOnly
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(onValueChange).toHaveBeenCalledWith(10);
    await userEvent.click(screen.getByRole('button', { name: 'Kurangi' }));
    expect(onValueChange).toHaveBeenCalledWith(8);
  });

  it('clamps to max when bumping up at the ceiling', async () => {
    const onValueChange = vi.fn();
    render(
      <NumberInput
        aria-label="qty"
        steppers
        value={10}
        max={10}
        onValueChange={onValueChange}
        readOnly
      />,
    );
    await userEvent.click(screen.getByRole('button', { name: 'Tambah' }));
    expect(onValueChange).toHaveBeenCalledWith(10);
  });

  it('routes typing through onValueChange and the native onChange', async () => {
    const onValueChange = vi.fn();
    const onChange = vi.fn();
    render(
      <NumberInput aria-label="qty" max={50} onValueChange={onValueChange} onChange={onChange} />,
    );
    await userEvent.type(screen.getByLabelText('qty'), '7');
    expect(onValueChange).toHaveBeenLastCalledWith(7);
    expect(onChange).toHaveBeenCalled();
  });

  it('does NOT clamp partial typing on a high-min field (year stays typeable)', async () => {
    // Regression: clamping each keystroke to min 1900 made "2024" un-typeable —
    // "2" snapped to 1900. Typing must surface the raw value; bounds are checked
    // by the stepper and by schema validation, not mid-type.
    const onValueChange = vi.fn();
    render(<NumberInput aria-label="tahun" min={1900} max={2100} onValueChange={onValueChange} />);
    await userEvent.type(screen.getByLabelText('tahun'), '2');
    expect(onValueChange).toHaveBeenLastCalledWith(2);
    expect(onValueChange).not.toHaveBeenCalledWith(1900);
  });
});

describe('TimePicker', () => {
  it('emits a time picked from the dropdown list', async () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="jam" onValueChange={onValueChange} />);
    await userEvent.click(screen.getByRole('button', { name: 'Pilih jam' }));
    await userEvent.click(screen.getByRole('option', { name: '08:00' }));
    expect(onValueChange).toHaveBeenCalledWith('08:00');
  });

  it('masks typed digits into 24-hour HH:mm (no AM/PM)', async () => {
    function Controlled(): JSX.Element {
      const [v, setV] = useState('');
      return <TimePicker aria-label="jam" value={v} onValueChange={setV} />;
    }
    render(<Controlled />);
    const input = screen.getByRole('textbox', { name: 'jam' });
    await userEvent.type(input, '1830');
    expect(input).toHaveValue('18:30');
  });

  it('picks a time from the dropdown list', async () => {
    function Controlled(): JSX.Element {
      const [v, setV] = useState('');
      return <TimePicker aria-label="jam" value={v} onValueChange={setV} />;
    }
    render(<Controlled />);
    await userEvent.click(screen.getByRole('button', { name: 'Pilih jam' }));
    await userEvent.click(screen.getByRole('option', { name: '09:30' }));
    expect(screen.getByRole('textbox', { name: 'jam' })).toHaveValue('09:30');
  });

  it('clamps an out-of-range time on blur', async () => {
    const onValueChange = vi.fn();
    render(<TimePicker aria-label="jam" value="99:99" onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox', { name: 'jam' });
    input.focus();
    await userEvent.tab();
    expect(onValueChange).toHaveBeenLastCalledWith('23:59');
  });
});

describe('Combobox', () => {
  const options = [
    { value: 'l1', label: 'L 1234 AB' },
    { value: 'l2', label: 'L 5678 CD' },
  ];

  it('opens, filters, and selects an option', async () => {
    const onValueChange = vi.fn();
    render(
      <Combobox options={options} onValueChange={onValueChange} placeholder="Pilih kendaraan" />,
    );
    await userEvent.click(screen.getByRole('combobox'));
    await userEvent.click(await screen.findByText('L 5678 CD'));
    expect(onValueChange).toHaveBeenCalledWith('l2');
  });

  it('shows the selected label', () => {
    render(<Combobox options={options} value="l1" />);
    expect(screen.getByText('L 1234 AB')).toBeInTheDocument();
  });
});

describe('DatePicker', () => {
  it('renders the formatted dd/MM/yyyy value', () => {
    render(<DatePicker value="2026-03-15" />);
    expect(screen.getByRole('textbox')).toHaveValue('15/03/2026');
  });

  it('shows the placeholder when empty', () => {
    render(<DatePicker placeholder="dd/mm/yyyy" />);
    expect(screen.getByRole('textbox')).toHaveAttribute('placeholder', 'dd/mm/yyyy');
  });

  it('parses a typed dd/MM/yyyy into ISO on blur', async () => {
    const onValueChange = vi.fn();
    render(<DatePicker onValueChange={onValueChange} />);
    const input = screen.getByRole('textbox');
    await userEvent.type(input, '15032026');
    expect(input).toHaveValue('15/03/2026');
    await userEvent.tab();
    expect(onValueChange).toHaveBeenCalledWith('2026-03-15');
  });
});

describe('Form (react-hook-form)', () => {
  function Harness() {
    const form = useForm<{ name: string }>({ defaultValues: { name: '' } });
    return (
      <Form {...form}>
        <form onSubmit={form.handleSubmit(() => undefined)} aria-label="form">
          <FormField
            control={form.control}
            name="name"
            rules={{ required: 'Nama wajib diisi' }}
            render={({ field }) => (
              <FormItem>
                <FormLabel required>Nama</FormLabel>
                <FormControl>
                  <Input {...field} />
                </FormControl>
                <FormDescription>Nama lengkap</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <button type="submit">Simpan</button>
        </form>
      </Form>
    );
  }

  it('wires label↔control and surfaces the validation message', async () => {
    render(<Harness />);
    const input = screen.getByLabelText(/Nama/);
    expect(input).toBeInTheDocument();
    expect(screen.getByText('Nama lengkap')).toBeInTheDocument();
    await userEvent.click(screen.getByRole('button', { name: 'Simpan' }));
    expect(await screen.findByText('Nama wajib diisi')).toBeInTheDocument();
    expect(input).toHaveAttribute('aria-invalid', 'true');
  });
});
