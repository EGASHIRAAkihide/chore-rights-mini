import { NextResponse } from 'next/server';

type ProblemOptions = {
  type?: string;
  detail?: string;
};

export function createProblemResponse(status: number, title: string, options: ProblemOptions = {}) {
  const { type = 'about:blank', detail } = options;
  const response = NextResponse.json(
    {
      type,
      title,
      status,
      detail,
    },
    { status },
  );

  response.headers.set('Content-Type', 'application/problem+json');
  return response;
}
