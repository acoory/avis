import 'reflect-metadata';
import { plainToInstance } from 'class-transformer';
import { validate } from 'class-validator';
import { SearchVehicleChecksQueryDto } from './search-vehicle-checks-query.dto';

describe('SearchVehicleChecksQueryDto', () => {
  it('trims the query and applies the default limit', async () => {
    const dto = plainToInstance(SearchVehicleChecksQueryDto, {
      q: '  AB-123-CD  ',
    });

    await expect(validate(dto)).resolves.toEqual([]);
    expect(dto.q).toBe('AB-123-CD');
    expect(dto.limit).toBe(8);
  });

  it('rejects short queries and limits above 20', async () => {
    const dto = plainToInstance(SearchVehicleChecksQueryDto, {
      q: 'A',
      limit: 21,
    });

    const errors = await validate(dto);
    expect(errors.map((error) => error.property)).toEqual(
      expect.arrayContaining(['q', 'limit']),
    );
  });
});
