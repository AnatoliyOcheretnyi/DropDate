import { apiRequest } from "../../../shared/api/client";
export type ProfileIdentity = {
  id: string;
  email: string;
  username: string;
  isSuperuser: boolean;
};
export const getProfile = (signal?: AbortSignal) =>
  apiRequest<ProfileIdentity>("/me", { auth: true, signal });
export const updateUsername = (username: string) =>
  apiRequest<ProfileIdentity>("/me", {
    method: "PATCH",
    auth: true,
    body: { username },
  });
