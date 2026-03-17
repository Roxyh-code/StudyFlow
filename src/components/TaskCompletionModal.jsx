import { useState } from 'react';
import Modal from './Modal';
import { Icons } from './Icons';
import { useApp } from '../context/AppContext';

const EXTRA_HOUR_OPTIONS = [0.5, 1, 2, 3];

const RESCHEDULE_OPTIONS = [
  { id: 'extend',    label: 'Extend today',          desc: 'Add time to this session' },
  { id: 'tomorrow',  label: 'Move to tomorrow',       desc: 'Shift block to next day' },
  { id: 'split',     label: 'Split across 2 days',    desc: 'Half today, half tomorrow' },
  { id: 'rebalance', label: 'Rebalance this week',    desc: 'Add a lighter session on a free day' },
];

const EARLY_OPTIONS = [
  { id: 'free',     label: 'Leave it free',   desc: 'Enjoy the extra time' },
  { id: 'move_up',  label: 'Move up next task', desc: 'Start the next study block earlier' },
  { id: 'rest',     label: 'Use for rest',     desc: 'Block out recovery time' },
];

export default function TaskCompletionModal({ block, open, onClose }) {
  const { completeBlock } = useApp();
  const [step, setStep] = useState(1);
  const [outcome, setOutcome] = useState(null);
  const [earlyAction, setEarlyAction] = useState('free');
  const [extraHours, setExtraHours] = useState(1);
  const [customHours, setCustomHours] = useState('');
  const [isCustom, setIsCustom] = useState(false);
  const [reschedule, setReschedule] = useState('extend');
  const [applied, setApplied] = useState(false);

  if (!block) return null;

  function resetState() {
    setStep(1);
    setOutcome(null);
    setEarlyAction('free');
    setExtraHours(1);
    setCustomHours('');
    setIsCustom(false);
    setReschedule('extend');
    setApplied(false);
  }

  function handleClose() {
    resetState();
    onClose();
  }

  function handleOutcomeSelect(o) {
    setOutcome(o);
    setStep(2);
  }

  function handleApply() {
    const effectiveExtra = isCustom ? (parseFloat(customHours) || 1) : extraHours;
    completeBlock(block.id, outcome, {
      action: earlyAction,
      extraHours: effectiveExtra,
      reschedule,
    });
    setApplied(true);
    setTimeout(() => {
      handleClose();
    }, 1200);
  }

  const outcomeCards = [
    {
      id: 'early',
      emoji: '🟢',
      label: 'Finished Early',
      desc: 'I completed it ahead of schedule',
      color: 'border-green-300 bg-green-50 hover:bg-green-100',
      activeColor: 'border-green-500 bg-green-100 ring-2 ring-green-400',
    },
    {
      id: 'ontime',
      emoji: '✅',
      label: 'Done On Time',
      desc: 'Completed exactly as planned',
      color: 'border-blue-300 bg-blue-50 hover:bg-blue-100',
      activeColor: 'border-blue-500 bg-blue-100 ring-2 ring-blue-400',
    },
    {
      id: 'moretime',
      emoji: '⏱',
      label: 'Need More Time',
      desc: 'I need additional study time',
      color: 'border-amber-300 bg-amber-50 hover:bg-amber-100',
      activeColor: 'border-amber-500 bg-amber-100 ring-2 ring-amber-400',
    },
  ];

  return (
    <Modal open={open} onClose={handleClose} title="How did it go?" size="md">
      <div className="space-y-4">
        {/* Block info */}
        <div className="bg-gray-50 rounded-xl p-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
            <Icons.BookOpen className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">{block.title}</p>
            <p className="text-xs text-gray-500">
              {block.date} · {block.startHour}:00 – {block.startHour + block.duration}:00 · {block.duration}h
            </p>
          </div>
        </div>

        {/* ── Step 1: Choose outcome ── */}
        {step === 1 && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600 font-medium">Select how the session went:</p>
            {outcomeCards.map(card => (
              <button
                key={card.id}
                onClick={() => handleOutcomeSelect(card.id)}
                className={`w-full text-left p-4 rounded-xl border-2 transition-all ${card.color}`}
              >
                <div className="flex items-center gap-3">
                  <span className="text-2xl">{card.emoji}</span>
                  <div>
                    <p className="text-sm font-bold text-gray-900">{card.label}</p>
                    <p className="text-xs text-gray-600 mt-0.5">{card.desc}</p>
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}

        {/* ── Step 2a: Finished Early ── */}
        {step === 2 && outcome === 'early' && (
          <div className="space-y-4">
            <div className="bg-green-50 border border-green-200 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">🟢</span>
              <div>
                <p className="text-sm font-semibold text-green-800">Great work finishing early!</p>
                <p className="text-xs text-green-600 mt-0.5">
                  You freed up ~{block.duration * 0.5 | 0 + 0.5}h. What would you like to do?
                </p>
              </div>
            </div>

            <p className="text-sm font-medium text-gray-700">What should we do with the saved time?</p>
            {EARLY_OPTIONS.map(opt => (
              <button
                key={opt.id}
                onClick={() => setEarlyAction(opt.id)}
                className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                  earlyAction === opt.id
                    ? 'border-green-500 bg-green-50 ring-2 ring-green-300'
                    : 'border-gray-200 bg-white hover:border-gray-300'
                }`}
              >
                <p className="text-sm font-semibold text-gray-800">{opt.label}</p>
                <p className="text-xs text-gray-500 mt-0.5">{opt.desc}</p>
              </button>
            ))}

            {!applied ? (
              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep(1)} className="btn-secondary text-xs py-2">
                  <Icons.ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button onClick={handleApply} className="flex-1 btn-primary text-xs py-2 bg-green-600 hover:bg-green-700">
                  <Icons.CheckCircle className="w-3.5 h-3.5" /> Apply
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <span className="text-green-600 font-semibold text-sm flex items-center justify-center gap-2">
                  <Icons.CheckCircle className="w-4 h-4" /> Applied!
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2b: Done On Time ── */}
        {step === 2 && outcome === 'ontime' && (
          <div className="space-y-4">
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 text-center">
              <span className="text-3xl">✅</span>
              <p className="text-sm font-semibold text-blue-800 mt-2">Excellent! Block completed on time.</p>
              <p className="text-xs text-blue-600 mt-1">This block will be marked complete and removed from your calendar.</p>
            </div>

            {!applied ? (
              <div className="flex gap-2">
                <button onClick={() => setStep(1)} className="btn-secondary text-xs py-2">
                  <Icons.ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button onClick={handleApply} className="flex-1 btn-primary text-xs py-2">
                  <Icons.CheckCircle className="w-3.5 h-3.5" /> Mark Complete
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <span className="text-green-600 font-semibold text-sm flex items-center justify-center gap-2">
                  <Icons.CheckCircle className="w-4 h-4" /> Marked Complete!
                </span>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2c: Need More Time ── */}
        {step === 2 && outcome === 'moretime' && (
          <div className="space-y-4">
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-center gap-3">
              <span className="text-xl">⏱</span>
              <div>
                <p className="text-sm font-semibold text-amber-800">No problem — let's reschedule.</p>
                <p className="text-xs text-amber-600 mt-0.5">How much extra time do you need?</p>
              </div>
            </div>

            {/* Extra hours selector */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">Extra time needed:</p>
              <div className="flex gap-2 flex-wrap">
                {EXTRA_HOUR_OPTIONS.map(h => (
                  <button
                    key={h}
                    onClick={() => { setExtraHours(h); setIsCustom(false); }}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                      !isCustom && extraHours === h
                        ? 'bg-amber-100 border-amber-400 text-amber-800'
                        : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                    }`}
                  >
                    +{h}h
                  </button>
                ))}
                <button
                  onClick={() => setIsCustom(true)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                    isCustom
                      ? 'bg-amber-100 border-amber-400 text-amber-800'
                      : 'bg-white border-gray-200 text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  Custom
                </button>
              </div>
              {isCustom && (
                <input
                  type="number"
                  min={0.5}
                  max={8}
                  step={0.5}
                  value={customHours}
                  onChange={e => setCustomHours(e.target.value)}
                  placeholder="e.g. 1.5"
                  className="input-field mt-2 text-sm"
                />
              )}
            </div>

            {/* Reschedule options */}
            <div>
              <p className="text-xs font-semibold text-gray-600 mb-2">How to reschedule:</p>
              <div className="space-y-2">
                {RESCHEDULE_OPTIONS.map(opt => (
                  <button
                    key={opt.id}
                    onClick={() => setReschedule(opt.id)}
                    className={`w-full text-left p-3 rounded-xl border-2 transition-all ${
                      reschedule === opt.id
                        ? 'border-amber-400 bg-amber-50 ring-2 ring-amber-300'
                        : 'border-gray-200 bg-white hover:border-gray-300'
                    }`}
                  >
                    <p className="text-xs font-semibold text-gray-800">{opt.label}</p>
                    <p className="text-[10px] text-gray-500 mt-0.5">{opt.desc}</p>
                  </button>
                ))}
              </div>
            </div>

            {!applied ? (
              <div className="flex gap-2 pt-2">
                <button onClick={() => setStep(1)} className="btn-secondary text-xs py-2">
                  <Icons.ChevronLeft className="w-3.5 h-3.5" /> Back
                </button>
                <button onClick={handleApply} className="flex-1 btn-primary text-xs py-2 bg-amber-600 hover:bg-amber-700">
                  <Icons.ArrowRight className="w-3.5 h-3.5" /> Apply Changes
                </button>
              </div>
            ) : (
              <div className="text-center py-2">
                <span className="text-green-600 font-semibold text-sm flex items-center justify-center gap-2">
                  <Icons.CheckCircle className="w-4 h-4" /> Changes Applied!
                </span>
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
}
