import { describe, test, expect, vi, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useAuth } from "@/hooks/use-auth";
import * as actions from "@/actions";
import * as getProjectsAction from "@/actions/get-projects";
import * as createProjectAction from "@/actions/create-project";
import * as anonWorkTracker from "@/lib/anon-work-tracker";

const mockPush = vi.fn();

vi.mock("next/navigation", () => ({
  useRouter: () => ({ push: mockPush }),
}));

vi.mock("@/actions", () => ({
  signIn: vi.fn(),
  signUp: vi.fn(),
}));

vi.mock("@/actions/get-projects", () => ({
  getProjects: vi.fn(),
}));

vi.mock("@/actions/create-project", () => ({
  createProject: vi.fn(),
}));

vi.mock("@/lib/anon-work-tracker", () => ({
  getAnonWorkData: vi.fn(),
  clearAnonWork: vi.fn(),
}));

describe("useAuth", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(anonWorkTracker.getAnonWorkData).mockReturnValue(null);
  });

  // --- Initial state ---

  test("returns initial state with isLoading false", () => {
    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);
    expect(typeof result.current.signIn).toBe("function");
    expect(typeof result.current.signUp).toBe("function");
  });

  // --- signIn happy paths ---

  test("signIn: redirects to new project when anon work exists", async () => {
    vi.mocked(actions.signIn).mockResolvedValue({ success: true });
    vi.mocked(anonWorkTracker.getAnonWorkData).mockReturnValue({
      messages: [{ id: "1", role: "user", content: "Hello" }],
      fileSystemData: { "/App.jsx": { type: "file", content: "..." } },
    });
    vi.mocked(createProjectAction.createProject).mockResolvedValue({
      id: "anon-proj-1",
      name: "Design from ...",
      userId: "user-1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "password123");
    });

    expect(actions.signIn).toHaveBeenCalledWith("user@example.com", "password123");
    expect(createProjectAction.createProject).toHaveBeenCalledWith(
      expect.objectContaining({
        messages: [{ id: "1", role: "user", content: "Hello" }],
        data: { "/App.jsx": { type: "file", content: "..." } },
      })
    );
    expect(anonWorkTracker.clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-proj-1");
    expect(returnValue).toEqual({ success: true });
  });

  test("signIn: redirects to most recent project when projects exist and no anon work", async () => {
    vi.mocked(actions.signIn).mockResolvedValue({ success: true });
    vi.mocked(getProjectsAction.getProjects).mockResolvedValue([
      { id: "proj-1", name: "Project 1", createdAt: new Date(), updatedAt: new Date() },
      { id: "proj-2", name: "Project 2", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(getProjectsAction.getProjects).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-1");
    expect(createProjectAction.createProject).not.toHaveBeenCalled();
  });

  test("signIn: creates new project when no anon work and no existing projects", async () => {
    vi.mocked(actions.signIn).mockResolvedValue({ success: true });
    vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
    vi.mocked(createProjectAction.createProject).mockResolvedValue({
      id: "new-proj-1",
      name: "New Design #12345",
      userId: "user-1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(createProjectAction.createProject).toHaveBeenCalledWith(
      expect.objectContaining({ messages: [], data: {} })
    );
    expect(mockPush).toHaveBeenCalledWith("/new-proj-1");
  });

  // --- signIn failure / error states ---

  test("signIn: does not call handlePostSignIn when result is failure", async () => {
    vi.mocked(actions.signIn).mockResolvedValue({
      success: false,
      error: "Invalid credentials",
    });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("user@example.com", "wrongpass");
    });

    expect(returnValue).toEqual({ success: false, error: "Invalid credentials" });
    expect(getProjectsAction.getProjects).not.toHaveBeenCalled();
    expect(createProjectAction.createProject).not.toHaveBeenCalled();
    expect(mockPush).not.toHaveBeenCalled();
  });

  test("signIn: returns result on failure without redirect", async () => {
    vi.mocked(actions.signIn).mockResolvedValue({
      success: false,
      error: "Email and password are required",
    });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signIn("", "");
    });

    expect(returnValue).toEqual({ success: false, error: "Email and password are required" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // --- signUp happy paths ---

  test("signUp: redirects to new project when anon work exists", async () => {
    vi.mocked(actions.signUp).mockResolvedValue({ success: true });
    vi.mocked(anonWorkTracker.getAnonWorkData).mockReturnValue({
      messages: [{ id: "1", role: "user", content: "Build me an app" }],
      fileSystemData: { "/App.jsx": { type: "file", content: "..." } },
    });
    vi.mocked(createProjectAction.createProject).mockResolvedValue({
      id: "anon-proj-2",
      name: "Design from ...",
      userId: "user-1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("new@example.com", "password123");
    });

    expect(actions.signUp).toHaveBeenCalledWith("new@example.com", "password123");
    expect(anonWorkTracker.clearAnonWork).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/anon-proj-2");
    expect(returnValue).toEqual({ success: true });
  });

  test("signUp: redirects to most recent project when no anon work and projects exist", async () => {
    vi.mocked(actions.signUp).mockResolvedValue({ success: true });
    vi.mocked(getProjectsAction.getProjects).mockResolvedValue([
      { id: "existing-proj", name: "My Project", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/existing-proj");
  });

  test("signUp: creates new project when no anon work and no projects", async () => {
    vi.mocked(actions.signUp).mockResolvedValue({ success: true });
    vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
    vi.mocked(createProjectAction.createProject).mockResolvedValue({
      id: "fresh-proj",
      name: "New Design #99",
      userId: "user-1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signUp("new@example.com", "password123");
    });

    expect(mockPush).toHaveBeenCalledWith("/fresh-proj");
  });

  // --- signUp failure / error states ---

  test("signUp: returns failure result without redirect", async () => {
    vi.mocked(actions.signUp).mockResolvedValue({
      success: false,
      error: "Email already registered",
    });

    const { result } = renderHook(() => useAuth());
    let returnValue: any;
    await act(async () => {
      returnValue = await result.current.signUp("existing@example.com", "password123");
    });

    expect(returnValue).toEqual({ success: false, error: "Email already registered" });
    expect(mockPush).not.toHaveBeenCalled();
  });

  // --- isLoading state management ---

  test("signIn: sets isLoading to true during async operation and false after", async () => {
    let resolveSignIn!: (value: any) => void;
    vi.mocked(actions.signIn).mockReturnValue(
      new Promise((resolve) => { resolveSignIn = resolve; })
    );
    vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
    vi.mocked(createProjectAction.createProject).mockResolvedValue({
      id: "proj-x",
      name: "New Design",
      userId: "u1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());
    expect(result.current.isLoading).toBe(false);

    let signInPromise: Promise<any>;
    act(() => {
      signInPromise = result.current.signIn("user@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignIn({ success: true });
      await signInPromise!;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("signIn: resets isLoading to false even when action throws", async () => {
    vi.mocked(actions.signIn).mockRejectedValue(new Error("Network error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await expect(
        result.current.signIn("user@example.com", "password123")
      ).rejects.toThrow("Network error");
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("signUp: sets isLoading to true during async operation and false after", async () => {
    let resolveSignUp!: (value: any) => void;
    vi.mocked(actions.signUp).mockReturnValue(
      new Promise((resolve) => { resolveSignUp = resolve; })
    );
    vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
    vi.mocked(createProjectAction.createProject).mockResolvedValue({
      id: "proj-y",
      name: "New Design",
      userId: "u1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());

    let signUpPromise: Promise<any>;
    act(() => {
      signUpPromise = result.current.signUp("new@example.com", "password123");
    });

    expect(result.current.isLoading).toBe(true);

    await act(async () => {
      resolveSignUp({ success: true });
      await signUpPromise!;
    });

    expect(result.current.isLoading).toBe(false);
  });

  test("signUp: resets isLoading to false even when action throws", async () => {
    vi.mocked(actions.signUp).mockRejectedValue(new Error("Server error"));

    const { result } = renderHook(() => useAuth());

    await act(async () => {
      await expect(
        result.current.signUp("user@example.com", "password123")
      ).rejects.toThrow("Server error");
    });

    expect(result.current.isLoading).toBe(false);
  });

  // --- Edge cases ---

  test("does not redirect or create project when anon work has empty messages", async () => {
    vi.mocked(actions.signIn).mockResolvedValue({ success: true });
    vi.mocked(anonWorkTracker.getAnonWorkData).mockReturnValue({
      messages: [],
      fileSystemData: { "/": { type: "directory" } },
    });
    vi.mocked(getProjectsAction.getProjects).mockResolvedValue([
      { id: "proj-existing", name: "Existing", createdAt: new Date(), updatedAt: new Date() },
    ]);

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    expect(anonWorkTracker.clearAnonWork).not.toHaveBeenCalled();
    expect(getProjectsAction.getProjects).toHaveBeenCalled();
    expect(mockPush).toHaveBeenCalledWith("/proj-existing");
  });

  test("new project name is a non-empty string", async () => {
    vi.mocked(actions.signIn).mockResolvedValue({ success: true });
    vi.mocked(getProjectsAction.getProjects).mockResolvedValue([]);
    vi.mocked(createProjectAction.createProject).mockResolvedValue({
      id: "rand-proj",
      name: "New Design #42",
      userId: "u1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    const callArg = vi.mocked(createProjectAction.createProject).mock.calls[0][0];
    expect(callArg.name).toMatch(/New Design #\d+/);
  });

  test("anon project name includes current time string", async () => {
    vi.mocked(actions.signIn).mockResolvedValue({ success: true });
    vi.mocked(anonWorkTracker.getAnonWorkData).mockReturnValue({
      messages: [{ id: "1", role: "user", content: "test" }],
      fileSystemData: {},
    });
    vi.mocked(createProjectAction.createProject).mockResolvedValue({
      id: "timed-proj",
      name: "Design from 12:00:00 PM",
      userId: "u1",
      messages: "[]",
      data: "{}",
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const { result } = renderHook(() => useAuth());
    await act(async () => {
      await result.current.signIn("user@example.com", "password123");
    });

    const callArg = vi.mocked(createProjectAction.createProject).mock.calls[0][0];
    expect(callArg.name).toMatch(/^Design from /);
  });
});
