import "@testing-library/jest-dom/vitest";
import { vi } from "vitest";

vi.stubEnv("VITE_API_BASE_URL", "http://127.0.0.1:3001/api/v1");
vi.stubEnv("VITE_SECURITY_PROVIDER", "development-stub");
