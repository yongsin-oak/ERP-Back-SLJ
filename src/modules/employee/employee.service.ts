import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Employee } from './entities/employee.entity';

@Injectable()
export class EmployeeService {
  constructor(
    @InjectRepository(Employee)
    private readonly employeeRepo: Repository<Employee>,
  ) {}

  async findAll(): Promise<Employee[]> {
    return this.employeeRepo.find();
  }
  
  async findOne(id: number): Promise<Employee> {
    return this.employeeRepo.findOneOrFail({ where: { id } });
  }

  async create(data: Partial<Employee>): Promise<Employee> {
    const newEmployee = this.employeeRepo.create(data);
    return this.employeeRepo.save(newEmployee);
  }

  async update(id: number, data: Partial<Employee>): Promise<Employee> {
    await this.employeeRepo.update(id, data);
    return this.findOne(id);
  }
  
  async remove(id: number): Promise<void> {
    await this.employeeRepo.delete(id);
  }
}
