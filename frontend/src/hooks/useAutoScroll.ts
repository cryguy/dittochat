import { useRef, useCallback } from 'react';
import type { VListHandle } from 'virtua';

interface UseAutoScrollOptions {
  threshold?: number;
}

export function useAutoScroll(options: UseAutoScrollOptions = {}) {
  const { threshold = 150 } = options;
  const listRef = useRef<VListHandle>(null);
  const isNearBottomRef = useRef(true);

  const checkNearBottom = useCallback(() => {
    const list = listRef.current;
    if (!list) return true;

    const scrollOffset = list.scrollOffset;
    const scrollSize = list.scrollSize;
    const viewportSize = list.viewportSize;

    const distanceFromBottom = scrollSize - scrollOffset - viewportSize;
    isNearBottomRef.current = distanceFromBottom < threshold;
    return isNearBottomRef.current;
  }, [threshold]);

  const scrollToBottom = useCallback(() => {
    const list = listRef.current;
    if (list) {
      list.scrollToIndex(Infinity, { align: 'end' });
    }
  }, []);

  const smartScroll = useCallback(() => {
    if (isNearBottomRef.current) {
      scrollToBottom();
    }
  }, [scrollToBottom]);

  const handleScroll = useCallback(() => {
    checkNearBottom();
  }, [checkNearBottom]);

  return {
    listRef,
    isNearBottom: () => isNearBottomRef.current,
    scrollToBottom,
    smartScroll,
    handleScroll,
  };
}
