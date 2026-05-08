import { BracketEditor } from '@/components/bracket/BracketEditor';
import { FinalizeBar } from '@/components/bracket/FinalizeBar';

export function Preview() {
  return (
    <>
      <BracketEditor
        header={
          <div className="rounded-md border border-warn/30 bg-warn/10 px-4 py-2 text-sm text-warn">
            Preview mode — picks save to your browser only. Create a pool to share with friends.
          </div>
        }
      />
      <FinalizeBar />
    </>
  );
}
