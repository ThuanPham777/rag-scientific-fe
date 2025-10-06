import { Tooltip } from 'antd';
import type { TooltipProps } from 'antd';

type Props = {
  title: TooltipProps['title'];
  children: React.ReactElement;
  placement?: TooltipProps['placement'];
  /** EP: đặt container = body để không bị che bởi overflow */
  getPopupContainer?: TooltipProps['getPopupContainer'];
};

export default function ATooltip({
  title,
  children,
  placement = 'top',
  getPopupContainer = () => document.body,
}: Props) {
  return (
    <Tooltip
      title={title}
      placement={placement}
      arrow
      overlayClassName='rag-tooltip'
      getPopupContainer={getPopupContainer}
      overlayInnerStyle={{
        fontSize: 13,
        lineHeight: '18px',
        maxWidth: 320,
      }}
    >
      {children}
    </Tooltip>
  );
}
