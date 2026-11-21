/**
 * Onboarding Stopwatch Timer Utility
 * Task 6.4: Proves the complete onboarding flow executes in under 15 minutes (900 seconds).
 */

export class OnboardingStopwatch {
  private startTimeMs: number;
  private endTimeMs: number | null = null;

  constructor() {
    this.startTimeMs = Date.now();
  }

  public stop(): number {
    this.endTimeMs = Date.now();
    return this.getElapsedSeconds();
  }

  public getElapsedMs(): number {
    const end = this.endTimeMs || Date.now();
    return end - this.startTimeMs;
  }

  public getElapsedSeconds(): number {
    return Number((this.getElapsedMs() / 1000).toFixed(2));
  }

  public getElapsedMinutes(): number {
    return Number((this.getElapsedSeconds() / 60).toFixed(2));
  }

  public isWithin15Minutes(): boolean {
    // 15 minutes = 900 seconds
    return this.getElapsedSeconds() <= 900;
  }
}
