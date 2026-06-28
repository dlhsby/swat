'use client';

import * as TabsPrimitive from '@radix-ui/react-tabs';
import { type ComponentPropsWithoutRef, type ElementRef, forwardRef } from 'react';

import { cn } from '@/lib/cn';

/** Tabs (design-system §3.15) — underline triggers, arrow-key roving focus. */
export const Tabs = TabsPrimitive.Root;

export const TabsList = forwardRef<
  ElementRef<typeof TabsPrimitive.List>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.List>
>(function TabsList({ className, ...props }, ref) {
  return (
    <TabsPrimitive.List
      ref={ref}
      // Scroll horizontally rather than clip/wrap when the triggers overflow (mobile).
      className={cn(
        'flex items-center gap-1 overflow-x-auto border-b border-neutral-200 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden',
        className,
      )}
      {...props}
    />
  );
});

export const TabsTrigger = forwardRef<
  ElementRef<typeof TabsPrimitive.Trigger>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Trigger>
>(function TabsTrigger({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Trigger
      ref={ref}
      className={cn(
        '-mb-px shrink-0 whitespace-nowrap border-b-2 border-transparent px-4 py-2.5 text-body-sm font-medium text-neutral-600 transition-colors hover:text-neutral-900 disabled:pointer-events-none disabled:opacity-50 data-[state=active]:border-primary-600 data-[state=active]:font-semibold data-[state=active]:text-primary-700',
        className,
      )}
      {...props}
    />
  );
});

export const TabsContent = forwardRef<
  ElementRef<typeof TabsPrimitive.Content>,
  ComponentPropsWithoutRef<typeof TabsPrimitive.Content>
>(function TabsContent({ className, ...props }, ref) {
  return (
    <TabsPrimitive.Content
      ref={ref}
      className={cn('py-4 focus:outline-none', className)}
      {...props}
    />
  );
});
