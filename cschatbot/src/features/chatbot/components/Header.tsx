import { X } from 'lucide-react';

const Header = () => {
  const handleClose = () => {
    // 커스텀 이벤트 발생
    const event = new CustomEvent('closeChatbot');
    window.dispatchEvent(event);
  };
  return (
    <div className="w-full flex justify-between items-center p-5 bg-wiz-red text-wiz-white">
      <h4 className="font-semibold">챗봇</h4>
      <X onClick={handleClose} className="cursor-pointer" />
    </div>
  );
};

export { Header };