'use client';

import { useTranslations } from 'next-intl';

import { VehicleModelsTab } from '@/components/fleet/vehicle-models-tab';
import { VehicleTypesTab } from '@/components/fleet/vehicle-types-tab';
import { VehiclesTab } from '@/components/fleet/vehicles-tab';
import { PageHead } from '@/components/shell/page-head';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui';

/**
 * Fleet master data grouped into one page (like Lokasi & Rute): the physical
 * Kendaraan, their Model (spec sheet), and the broad Tipe (body class).
 */
export default function VehiclesPage(): JSX.Element {
  const t = useTranslations('nav');
  return (
    <>
      <PageHead title={t('vehicles')} />
      <Tabs defaultValue="vehicles">
        <TabsList>
          <TabsTrigger value="vehicles">Kendaraan</TabsTrigger>
          <TabsTrigger value="models">Model Kendaraan</TabsTrigger>
          <TabsTrigger value="types">Tipe Kendaraan</TabsTrigger>
        </TabsList>
        <TabsContent value="vehicles">
          <VehiclesTab />
        </TabsContent>
        <TabsContent value="models">
          <VehicleModelsTab />
        </TabsContent>
        <TabsContent value="types">
          <VehicleTypesTab />
        </TabsContent>
      </Tabs>
    </>
  );
}
