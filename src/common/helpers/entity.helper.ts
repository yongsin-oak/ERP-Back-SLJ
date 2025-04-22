import { ConflictException, NotFoundException } from '@nestjs/common';
import { FindOneOptions, Repository } from 'typeorm';

/**
 * เช็คว่า entity มีอยู่ไหม ถ้าไม่มีจะ throw NotFoundException
 */
export async function getEntityOrNotFound<T>(
  repo: Repository<T>,
  options: FindOneOptions<T>,
  entityName: string,
): Promise<T> {
  const entity = await repo.findOne(options);
  if (!entity) {
    throw new NotFoundException(`${entityName} not found`);
  }
  return entity;
}

/**
 * เช็คว่า entity ซ้ำไหม ถ้าซ้ำจะ throw ConflictException
 */
export async function throwIfEntityExists<T>(
  repo: Repository<T>,
  options: FindOneOptions<T>,
  entityName: string,
): Promise<void> {
  const existing = await repo.findOne(options);
  if (existing) {
    throw new ConflictException(`${entityName} already exists`);
  }
}
