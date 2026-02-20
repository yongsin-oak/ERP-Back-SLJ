import { PaginatedResponseDto } from '../dto/paginated.dto';

export const formattedResponsePaginated = <T>(
  data: T[],
  page: number,
  limit: number,
  total: number,
): PaginatedResponseDto<T> => {
  const totalPages = Math.ceil(total / limit);
  return {
    data,
    pagination: {
      page,
      limit,
      total,
      hasNextPage: page < totalPages,
      hasPreviousPage: page > 1,
      totalPages,
    },
  };
};
