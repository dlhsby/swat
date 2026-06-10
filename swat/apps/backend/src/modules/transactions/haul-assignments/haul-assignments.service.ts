import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';

import { type SessionUser } from '../../../common/auth/session.types';
import { type TripDto, toTripDto } from '../trips/trip.mapper';

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
}
