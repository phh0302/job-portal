import { useEffect } from 'react';
import type { FieldPath, FieldValues, UseFormGetValues, UseFormSetValue } from 'react-hook-form';

/**
 * <select> đăng ký bằng register() (không controlled) mà danh sách lựa chọn tải sau (vd. tỉnh/thành từ API):
 * lúc form gắn giá trị mặc định thì chưa có <option> tương ứng nên trình duyệt hiện "-- Chọn --".
 * Khi danh sách đã có, gán lại đúng giá trị form đang giữ để ô chọn hiển thị đúng (BUG-09).
 */
export function useSelectSync<T extends FieldValues>(
  getValues: UseFormGetValues<T>,
  setValue: UseFormSetValue<T>,
  name: FieldPath<T>,
  optionsLoaded: boolean,
) {
  useEffect(() => {
    if (optionsLoaded) setValue(name, getValues(name));
  }, [optionsLoaded, name, getValues, setValue]);
}
