/**
 * Frontend mirrors of the backend transaction DTOs (BigInt ids → string,
 * Decimal → number, dates → ISO-8601 strings, operationDate → YYYY-MM-DD).
 * Kept in step with `modules/transactions` mappers.
 */

export type TripStatus = 'IN_PROGRESS' | 'DONE' | 'VERIFIED';
export type DayStatus = 'IN_PROGRESS' | 'DONE';
export type RouteCategory = 'PICKUP' | 'DISPOSAL' | 'REFUEL' | 'DEPART_POOL' | 'RETURN_POOL';

export interface TripDto {
  id: string;
  haulAssignmentId: string;
  routeId: number | null;
  routeCategory: RouteCategory | null;
  routeLabel: string | null;
  name: string;
  status: TripStatus;
  operationDate: string;
  targetTime: string | null;
  actualTime: string | null;
  targetOdometer: number;
  actualOdometer: number;
  tareWeight: number;
  grossWeight: number | null;
  netWeight: number | null;
  wasteVolume: number | null;
  fuelRequestedLiters: number | null;
  fuelApprovedLiters: number | null;
  recordedById: number | null;
  recordedByName: string | null;
  verifiedById: number | null;
  verifiedByName: string | null;
  verifiedAt: string | null;
  realizationEntryAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface HaulAssignmentDto {
  id: string;
  haulId: string;
  driverId: number;
  driverName: string;
  crewScheduleId: number | null;
  status: string;
  operationDate: string;
  departTargetOdometer: number;
  departActualOdometer: number | null;
  returnTargetOdometer: number;
  returnActualOdometer: number | null;
  departTargetTime: string | null;
  departActualTime: string | null;
  returnTargetTime: string | null;
  returnActualTime: string | null;
  trips: TripDto[];
  createdAt: string;
  updatedAt: string;
}

export interface HaulDto {
  id: string;
  vehicleId: number;
  vehiclePlate: string;
  status: string;
  operationDate: string;
  assignments: HaulAssignmentDto[];
}

export interface TransactionDayDto {
  id: number;
  date: string;
  status: DayStatus;
  hauls: HaulDto[];
  createdAt: string;
  updatedAt: string;
}

export interface TripDetailDto extends TripDto {
  haulAssignment: {
    id: string;
    driverId: number;
    driverName: string;
    haul: {
      id: string;
      vehicleId: number;
      vehiclePlate: string;
      transactionDay: { id: number; date: string; status: DayStatus };
    };
  };
}

export interface DailyInitResult {
  created: boolean;
  date: string;
  transactionDayId: number;
  hauls: number;
  assignments: number;
  trips: number;
}
