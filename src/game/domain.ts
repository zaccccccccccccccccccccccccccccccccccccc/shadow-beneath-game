export type CasePhase = 'roam' | 'judge' | 'replay';
export type Classification = 'courtesy' | 'declaration' | 'corruption';
export type EvidenceOutcome = 'correct' | 'incorrect' | 'ignored';

export interface GameState {
  lampOil: number;
  redLines: number;
  phase: CasePhase;
  capturedEventId: string | null;
  resolvedEventIds: string[];
}

interface StateOptions {
  lampOil?: number;
}

const evidenceClassifications: Record<string, Classification> = {
  'soda-gift': 'courtesy',
  'student-card': 'declaration',
};

export function createGameState(options: StateOptions = {}): GameState {
  return {
    lampOil: options.lampOil ?? 100,
    redLines: 0,
    phase: 'roam',
    capturedEventId: null,
    resolvedEventIds: [],
  };
}

export function captureEvent(state: GameState, eventId: string): GameState {
  if (state.phase !== 'roam' || state.resolvedEventIds.includes(eventId)) {
    return state;
  }

  return { ...state, phase: 'judge', capturedEventId: eventId };
}

export function classifyEvidence(
  state: GameState,
  eventId: string,
  classification: Classification,
): { state: GameState; outcome: EvidenceOutcome } {
  if (state.phase !== 'judge' || state.capturedEventId !== eventId) {
    return { state, outcome: 'ignored' };
  }
  const correct = evidenceClassifications[eventId] === classification;
  const resolved = [...state.resolvedEventIds, eventId];

  return {
    outcome: correct ? 'correct' : 'incorrect',
    state: {
      ...state,
      lampOil: correct ? Math.min(100, state.lampOil + 15) : state.lampOil,
      redLines: correct ? state.redLines : state.redLines + 1,
      phase: 'roam',
      capturedEventId: null,
      resolvedEventIds: resolved,
    },
  };
}

export function drainLamp(state: GameState, amount: number): GameState {
  const lampOil = Math.max(0, state.lampOil - amount);
  return { ...state, lampOil, phase: lampOil === 0 ? 'replay' : state.phase };
}
