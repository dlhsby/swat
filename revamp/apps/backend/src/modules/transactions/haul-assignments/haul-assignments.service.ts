import {
  BadRequestException,
  Injectable,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';

import { type SessionUser } from '../../../common/auth/session.types';
import { combineDateAndTime, parseTimeOnly } from '../../../common/dates';
import { type TripDto, toTripDto } from '../trips/trip.mapper';

import { type AddAssignmentDto, type AddHaulDto } from './dto/add-assignment.dto';
import { type RecordDepartDto } from './dto/record-depart.dto';
import { type RecordReturnDto } from './dto/record-return.dto';
import { type HaulAssignmentDto, toHaulAssignmentDto } from './haul-assignment.mapper';
import {
  type HaulAssignmentForRecording,
  HaulAssignmentsRepository,
} from './haul-assignments.repository';

@Injectable()
export class HaulAssignmentsService {
  constructor(private readonly repo: HaulAssignmentsRepository) {}

  private async load(idParam: string): Promise<HaulAssignmentForRecording> {
    const assignment = await this.repo.findForRecording(idParam);
    if (!assignment) {
      throw new NotFoundException('Penugasan haul tidak ditemukan.');
    }
    return assignment;
  }

  async recordDepart(
    idParam: string,
    dto: RecordDepartDto,
    user: SessionUser,
  ): Promise<HaulAssignmentDto> {
    const assignment = await this.load(idParam);
    if (assignment.status === 'DONE') {
      throw new BadRequestException('Penugasan sudah selesai dan tidak dapat diubah.');
    }
    const floor = Math.max(
      assignment.haul.vehicle.currentOdometer,
      assignment.departTargetOdometer,
    );
    if (dto.actualOdometer < floor) {
      throw new BadRequestException(`Odometer keberangkatan tidak boleh kurang dari ${floor} km.`);
    }

    const updated = await this.repo.recordDepart(assignment.id, {
      departActualOdometer: dto.actualOdometer,
      departActualTime: new Date(dto.actualTime),
      updatedBy: { connect: { id: user.id } },
    });
    return toHaulAssignmentDto(updated);
  }

  async recordReturn(
    idParam: string,
    dto: RecordReturnDto,
    user: SessionUser,
  ): Promise<HaulAssignmentDto> {
    const assignment = await this.load(idParam);
    if (assignment.status === 'DONE') {
      throw new BadRequestException('Penugasan sudah selesai dan tidak dapat diubah.');
    }
    if (assignment.departActualOdometer === null || assignment.departActualTime === null) {
      throw new BadRequestException('Keberangkatan harus dicatat sebelum kepulangan.');
    }
    if (dto.actualOdometer < assignment.departActualOdometer) {
      throw new BadRequestException(
        'Odometer kepulangan tidak boleh kurang dari odometer keberangkatan.',
      );
    }
    const returnTime = new Date(dto.actualTime);
    if (returnTime < assignment.departActualTime) {
      throw new BadRequestException('Waktu kepulangan tidak boleh sebelum waktu keberangkatan.');
    }

    const siblingsDone = assignment.haul.assignments
      .filter((a) => a.id !== assignment.id)
      .every((a) => a.status === 'DONE');

    const updated = await this.repo.recordReturn({
      id: assignment.id,
      haulId: assignment.haul.id,
      vehicleId: assignment.haul.vehicleId,
      odometer: dto.actualOdometer,
      closeHaul: siblingsDone,
      data: {
        returnActualOdometer: dto.actualOdometer,
        returnActualTime: returnTime,
        status: 'DONE',
        updatedBy: { connect: { id: user.id } },
      },
    });
    return toHaulAssignmentDto(updated);
  }

  async listTrips(idParam: string): Promise<TripDto[]> {
    const assignment = await this.load(idParam);
    const trips = await this.repo.listTrips(assignment.id);
    return trips.map(toTripDto);
  }

  /** Add a driver-shift to a vehicle's existing haul (e.g. a second shift). */
  async addAssignment(dto: AddAssignmentDto, user: SessionUser): Promise<HaulAssignmentDto> {
    const haul = await this.repo.findHaul(dto.haulId);
    if (!haul) {
      throw new NotFoundException('Haul tidak ditemukan.');
    }
    if (haul.status === 'DONE') {
      throw new BadRequestException('Haul sudah selesai dan tidak dapat ditambah.');
    }
    if (!(await this.repo.driverExists(dto.driverId))) {
      throw new NotFoundException('Pengemudi tidak ditemukan.');
    }
    const odometer = haul.vehicle.currentOdometer;
    const assignment = await this.repo.createAssignment({
      haulId: haul.id,
      driverId: dto.driverId,
      operationDate: haul.operationDate,
      status: 'IN_PROGRESS',
      departTargetOdometer: odometer,
      returnTargetOdometer: odometer,
      departTargetTime: this.targetTime(haul.operationDate, dto.departTime),
      returnTargetTime: this.targetTime(haul.operationDate, dto.returnTime),
      createdById: user.id,
    });
    return toHaulAssignmentDto(assignment);
  }

  /** Add a vehicle (new haul + first shift) to an already-initialised day. */
  async addHaul(dto: AddHaulDto, user: SessionUser): Promise<HaulAssignmentDto> {
    const day = await this.repo.findDay(dto.transactionDayId);
    if (!day) {
      throw new NotFoundException('Hari transaksi tidak ditemukan.');
    }
    const vehicle = await this.repo.findVehicle(dto.vehicleId);
    if (!vehicle) {
      throw new NotFoundException('Kendaraan tidak ditemukan.');
    }
    if (!(await this.repo.driverExists(dto.driverId))) {
      throw new NotFoundException('Pengemudi tidak ditemukan.');
    }
    if (await this.repo.haulExistsForVehicle(day.id, vehicle.id)) {
      throw new UnprocessableEntityException('Kendaraan sudah terjadwal pada hari ini.');
    }
    const odometer = vehicle.currentOdometer;
    const assignment = await this.repo.createHaulWithAssignment(
      {
        transactionDayId: day.id,
        vehicleId: vehicle.id,
        operationDate: day.date,
        status: 'IN_PROGRESS',
      },
      {
        driverId: dto.driverId,
        operationDate: day.date,
        status: 'IN_PROGRESS',
        departTargetOdometer: odometer,
        returnTargetOdometer: odometer,
        departTargetTime: this.targetTime(day.date, dto.departTime),
        returnTargetTime: this.targetTime(day.date, dto.returnTime),
        createdById: user.id,
      },
    );
    return toHaulAssignmentDto(assignment);
  }

  private targetTime(date: Date, time: string | undefined): Date | null {
    return time ? combineDateAndTime(date, parseTimeOnly(time)) : null;
  }
}
