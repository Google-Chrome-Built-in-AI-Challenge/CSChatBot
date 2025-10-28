import { Button } from '@/components/ui/button/button';

interface WidgetButtonProps {
  actionProvider: {
    handleClickHomepage: () => void;
    handleClickTicketLink: () => void;
  };
}

function WidgetButton(props: WidgetButtonProps) {
  return (
    <div className="flex gap-2">
      <Button
        onClick={() => props.actionProvider.handleClickHomepage()}
        className="hover:bg-wiz-red border-wiz-black border-2 border-solid"
      >
        내 멤버십
      </Button>
      <Button
        onClick={() => props.actionProvider.handleClickTicketLink()}
        className="hover:bg-wiz-red border-wiz-black border-2 border-solid"
      >
        Q&A
      </Button>
    </div>
  );
}

export { WidgetButton };
export type { WidgetButtonProps };