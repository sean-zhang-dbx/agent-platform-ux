import { useNavigate } from 'react-router';
import { ChevronLeft, ChevronRight, Code2, LoaderCircle, MessageSquareQuote, X } from 'lucide-react';
import { useStore } from '../state/store';
import { FLAGSHIP, SRA_ID } from '../data/capabilities';
import { PRESENTER_STEPS, type StepAction } from './steps';

const SUBMIT_STEP = 4;
const BLOCKED_STEP = 6;

function bold(text: string) {
  return text.split('**').map((part, i) => (i % 2 === 1 ? <b key={part} className="text-white">{part}</b> : <span key={part}>{part}</span>));
}

const REPORT_STEP = 7;

export function PresenterBar() {
  const { presenter, setPresenter, active, submitRequest, approvePod } = useStore();
  const navigate = useNavigate();
  if (!presenter.on) return null;

  const denied = active?.logs.some((l) => l.kind === 'deny') ?? false;
  const reportReady = active ? ['pending_approval', 'completed', 'changes_requested'].includes(active.status) : false;

  // Follow the live run: the bar moves on by itself when the blocked and report moments happen.
  let shown = presenter.step;
  if (!presenter.hold && shown === BLOCKED_STEP - 1 && denied) shown = BLOCKED_STEP;
  if (!presenter.hold && shown === BLOCKED_STEP && reportReady) shown = REPORT_STEP;

  const waitingFor = presenter.hold
    ? null
    : shown === SUBMIT_STEP && active?.status !== 'pod_review' && active?.status !== 'in_progress'
      ? 'the pod draft'
      : shown === BLOCKED_STEP - 1 && !denied
        ? 'the governance moment'
        : shown === BLOCKED_STEP && !reportReady
          ? 'the report'
          : null;

  const flagshipActive = active?.capabilityId === SRA_ID && ['composing', 'pod_review', 'in_progress', 'pending_approval'].includes(active.status);
  const run = (action: StepAction) => {
    switch (action) {
      case 'home':
        void navigate('/');
        break;
      case 'capabilities':
        void navigate('/capabilities/assess-submission-readiness');
        break;
      case 'agents':
        void navigate('/agents?open=clinical');
        break;
      case 'versions':
        void navigate('/pods/submission-readiness#versions');
        break;
      case 'governance':
        void navigate('/governance');
        break;
      case 'catalog':
        void navigate('/capabilities');
        break;
      case 'chat':
      case 'none':
        void navigate('/ask');
        break;
      case 'submit':
        void navigate('/ask');
        if (!flagshipActive) submitRequest(FLAGSHIP.sampleRequest, SRA_ID);
        break;
      case 'approvePod':
        void navigate('/ask');
        if (active?.status === 'pod_review') approvePod(active.id);
        break;
    }
  };

  const go = (target: number) => {
    const clamped = Math.max(0, Math.min(PRESENTER_STEPS.length - 1, target));
    const action = PRESENTER_STEPS[clamped].action;
    // Going back only moves between screens; it never re-submits or re-approves.
    const back = target < shown;
    if (back) run(action === 'submit' || action === 'approvePod' ? 'chat' : action);
    else run(action);
    setPresenter({ on: true, step: clamped, hold: back });
  };

  const step = PRESENTER_STEPS[shown];
  const last = shown === PRESENTER_STEPS.length - 1;

  return (
    <div className="pointer-events-auto fixed bottom-20 right-4 z-[60] w-[min(440px,calc(100%-2rem))] rounded-2xl bg-[var(--ink)] p-4 text-white shadow-2xl">
      <div className="flex items-center justify-between">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-[var(--brand)]">
          Presenter · step {shown + 1} of {PRESENTER_STEPS.length}
        </div>
        <button type="button" aria-label="Close presenter" onClick={() => setPresenter({ on: false, step: shown, hold: presenter.hold })} className="rounded p-1 text-[#bdb6b0] hover:bg-white/10">
          <X className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-1 text-base font-semibold">{step.title}</div>
      <div className="mt-2 flex gap-2 text-sm leading-relaxed text-[#efe8e3]">
        <MessageSquareQuote className="mt-0.5 h-4 w-4 shrink-0 text-[var(--brand)]" />
        <span>{bold(step.say)}</span>
      </div>
      <div className="mt-3 rounded-lg bg-white/5 p-2.5">
        <div className="mb-1 flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wide text-[#f7a07a]">
          <Code2 className="h-3.5 w-3.5" /> In the live build
        </div>
        <div className="text-xs leading-relaxed text-[#d6cfc9]">{step.live}</div>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <button type="button" onClick={() => go(shown - 1)} disabled={shown === 0} className="flex items-center gap-1 rounded-lg px-2 py-1.5 text-sm text-[#d6cfc9] hover:bg-white/10 disabled:opacity-30">
          <ChevronLeft className="h-4 w-4" /> Back
        </button>
        <div className="flex gap-1">
          {PRESENTER_STEPS.map((s, i) => (
            <span key={s.title} className={`h-1.5 w-4 rounded-full ${i <= shown ? 'bg-[var(--brand)]' : 'bg-white/20'}`} />
          ))}
        </div>
        {waitingFor ? (
          <span className="flex items-center gap-1.5 px-2 py-1.5 text-xs text-[#bdb6b0]">
            <LoaderCircle className="h-3.5 w-3.5 animate-spin" /> Waiting for {waitingFor}
          </span>
        ) : (
          <button
            type="button"
            onClick={() => (last ? setPresenter({ on: false, step: 0, hold: false }) : go(shown + 1))}
            className="flex items-center gap-1 rounded-lg bg-[var(--brand)] px-3 py-1.5 text-sm font-semibold hover:bg-[var(--brand-strong)]"
          >
            {last ? 'Finish' : 'Next'} {!last && <ChevronRight className="h-4 w-4" />}
          </button>
        )}
      </div>
    </div>
  );
}
