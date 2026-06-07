import { UploadService } from '../../src/services/uploadService';
import type { IUploadRepository } from '../../src/types/upload';
import { BulkValidationError } from '../../src/types/upload';
import type { CreateEmployeeDto } from '../../src/types/employee';

const VALID_DTO: CreateEmployeeDto = {
  name: 'Alice Johnson',
  email: 'alice@example.com',
  gender: 'Female',
  role: 'Engineer',
  department: 'Engineering',
  country: 'Germany',
  salary: 87400,
  employment_type: 'Full-time',
  joining_date: '2019-03-15',
};

function makeRepo(overrides: Partial<IUploadRepository> = {}): IUploadRepository {
  return {
    insertMany: jest.fn().mockResolvedValue(undefined),
    findExistingEmails: jest.fn().mockResolvedValue([]),
    ...overrides,
  };
}

describe('UploadService.bulkUpload', () => {
  it('returns { inserted: N } and calls insertMany on valid rows', async () => {
    const repo = makeRepo();
    const service = new UploadService(repo);
    const result = await service.bulkUpload([VALID_DTO]);
    expect(result).toEqual({ inserted: 1 });
    expect(repo.insertMany).toHaveBeenCalledWith([VALID_DTO]);
  });

  it('throws BulkValidationError when rows exceed 500', async () => {
    const rows = Array.from({ length: 501 }, (_, i) => ({ ...VALID_DTO, email: `row${i}@example.com` }));
    const service = new UploadService(makeRepo());
    await expect(service.bulkUpload(rows)).rejects.toBeInstanceOf(BulkValidationError);
  });

  it('throws with field error when name is empty', async () => {
    const invalid = { ...VALID_DTO, name: '' };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch((e: unknown) => e) as BulkValidationError;
    expect(err).toBeInstanceOf(BulkValidationError);
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'name' });
  });

  it('throws with field error when email is invalid format', async () => {
    const invalid = { ...VALID_DTO, email: 'not-an-email' };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch((e: unknown) => e) as BulkValidationError;
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'email' });
  });

  it('throws with field error when gender is invalid', async () => {
    const invalid = { ...VALID_DTO, gender: 'Unknown' as 'Male' };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch((e: unknown) => e) as BulkValidationError;
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'gender' });
  });

  it('throws with field error when employment_type is invalid', async () => {
    const invalid = { ...VALID_DTO, employment_type: 'PartTime' as 'Full-time' };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch((e: unknown) => e) as BulkValidationError;
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'employment_type' });
  });

  it('throws with field error when salary is zero', async () => {
    const invalid = { ...VALID_DTO, salary: 0 };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch((e: unknown) => e) as BulkValidationError;
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'salary' });
  });

  it('throws with field error when joining_date is wrong format', async () => {
    const invalid = { ...VALID_DTO, joining_date: '15/03/2019' };
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload([invalid]).catch((e: unknown) => e) as BulkValidationError;
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'joining_date' });
  });

  it('flags all occurrences of a duplicate email in the batch', async () => {
    const rows = [VALID_DTO, { ...VALID_DTO }];
    const service = new UploadService(makeRepo());
    const err = await service.bulkUpload(rows).catch((e: unknown) => e) as BulkValidationError;
    expect(err).toBeInstanceOf(BulkValidationError);
    const emailErrors = err.details.errors.filter(e => e.field === 'email');
    expect(emailErrors).toHaveLength(2);
    expect(emailErrors.map(e => e.index).sort()).toEqual([0, 1]);
  });

  it('throws with DB collision errors when email already exists', async () => {
    const repo = makeRepo({
      findExistingEmails: jest.fn().mockResolvedValue([VALID_DTO.email]),
    });
    const service = new UploadService(repo);
    const err = await service.bulkUpload([VALID_DTO]).catch((e: unknown) => e) as BulkValidationError;
    expect(err).toBeInstanceOf(BulkValidationError);
    expect(err.details.errors[0]).toMatchObject({ index: 0, field: 'email', message: 'email already exists' });
  });

  it('does not call insertMany when there are validation errors', async () => {
    const repo = makeRepo();
    const service = new UploadService(repo);
    await service.bulkUpload([{ ...VALID_DTO, name: '' }]).catch(() => {});
    expect(repo.insertMany).not.toHaveBeenCalled();
  });
});
