/* eslint-disable @typescript-eslint/no-explicit-any */

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3333";
export class ApiError extends Error {
  status: number;
  constructor(status: number, message: string) {
    super(message);
    this.status = status;
  }
}

async function request(method: string, url: string, body?: any) {
  const token = localStorage.getItem("hq_token");

  const headers: HeadersInit = {
    "Content-Type": "application/json",
  };

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const res = await fetch(API_URL + url, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });

  let data: any = null;

  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (!res.ok) {
    const issues = data?.issues ?? data?.error?.issues;
    const message =
      typeof data?.error === "string"
        ? data.error
        : issues?.map((issue: { message: string }) => issue.message).join(" ");
    throw new ApiError(
      res.status,
      message || "Não foi possível concluir a solicitação. Tente novamente.",
    );
  }

  return data;
}

export const api = {
  get: (url: string) => request("GET", url),
  post: (url: string, body?: any) => request("POST", url, body),
  put: (url: string, body?: any) => request("PUT", url, body),
  delete: (url: string) => request("DELETE", url),
  patch: (url: string, body?: any) => request("PATCH", url, body),
};
