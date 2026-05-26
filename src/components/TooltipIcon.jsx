const TooltipIcon = ({ text }) => {
  return (
    <span className="ml-1 cursor-help text-gray-500 hover:text-cyan-400" title={text}>
      ⓘ
    </span>
  );
};

export default TooltipIcon;

