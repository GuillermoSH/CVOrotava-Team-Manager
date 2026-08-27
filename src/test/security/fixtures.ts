export const PLAYER = {
  id: "11111111-1111-4111-8111-111111111111",
  email: "jugador@cvorotava.test",
  isActive: true,
  isAdmin: false,
} as const;

export const OTHER_PLAYER = {
  id: "22222222-2222-4222-8222-222222222222",
  email: "otro@cvorotava.test",
  isActive: true,
  isAdmin: false,
} as const;

export const ADMIN = {
  id: "33333333-3333-4333-8333-333333333333",
  email: "admin@cvorotava.test",
  isActive: true,
  isAdmin: true,
} as const;

export const INACTIVE_PLAYER = {
  id: "44444444-4444-4444-8444-444444444444",
  email: "exjugador@cvorotava.test",
  isActive: false,
  isAdmin: false,
} as const;

export const COACH = {
  id: "55555555-5555-4555-8555-555555555555",
  email: "entrenador@cvorotava.test",
  isActive: true,
  isAdmin: false,
} as const;
