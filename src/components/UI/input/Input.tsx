import React, { forwardRef } from 'react';
import { Input } from 'antd';
import type { InputProps, InputRef } from 'antd';
import type { TextAreaProps } from 'antd/es/input';

type Variant = 'outlined' | 'borderless' | 'filled';

type BaseExtras = {
  /** Thêm lớp cho khung bọc ngoài (hữu ích khi muốn bo góc/đổ bóng) */
  containerClassName?: string;
  /** Kích hoạt shadow + border mặc định giống card input */
  framed?: boolean;
};

type AppInputProps = Omit<InputProps, 'variant'> &
  BaseExtras & {
    variant?: Variant;
    leftAddon?: React.ReactNode;
    rightAddon?: React.ReactNode;
  };

type AppTextAreaProps = Omit<TextAreaProps, 'variant' | 'onPressEnter'> &
  BaseExtras & {
    variant?: Variant;
    /** Enter để gửi, Shift+Enter xuống dòng */
    submitOnEnter?: boolean;
    onSubmit?: () => void;
  };

/** Input 1 dòng */
export const AppInput = forwardRef<InputRef, AppInputProps>(
  (
    {
      containerClassName = '',
      framed = false,
      variant = 'outlined',
      leftAddon,
      rightAddon,
      className,
      ...rest
    },
    ref
  ) => {
    return (
      <div
        className={[
          containerClassName,
          framed ? 'rounded-lg border bg-white overflow-hidden shadow-sm' : '',
          'flex items-stretch',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        {leftAddon ? (
          <div className='px-3 grid place-items-center border-r bg-gray-50'>
            {leftAddon}
          </div>
        ) : null}
        <Input
          ref={ref}
          variant={variant}
          className={['!h-10', className].filter(Boolean).join(' ')}
          {...rest}
        />
        {rightAddon ? (
          <div className='px-3 grid place-items-center border-l bg-gray-50'>
            {rightAddon}
          </div>
        ) : null}
      </div>
    );
  }
);
AppInput.displayName = 'AppInput';

/** TextArea nhiều dòng */
export const AppTextArea = forwardRef<HTMLTextAreaElement, AppTextAreaProps>(
  (
    {
      containerClassName = '',
      framed = false,
      variant = 'borderless',
      submitOnEnter,
      onSubmit,
      className,
      ...rest
    },
    ref
  ) => {
    return (
      <div
        className={[
          containerClassName,
          framed ? 'rounded-lg border bg-white overflow-hidden shadow-sm' : '',
        ]
          .filter(Boolean)
          .join(' ')}
      >
        <Input.TextArea
          ref={ref}
          variant={variant}
          className={['!px-3 !pt-3 !pb-1', className].filter(Boolean).join(' ')}
          autoSize={{ minRows: 2, maxRows: 6 }}
          onPressEnter={(e) => {
            if (submitOnEnter && !e.shiftKey) {
              e.preventDefault();
              onSubmit?.();
            }
          }}
          {...rest}
        />
      </div>
    );
  }
);
AppTextArea.displayName = 'AppTextArea';

export default {
  Input: AppInput,
  TextArea: AppTextArea,
};
