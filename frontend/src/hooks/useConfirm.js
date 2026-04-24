import { useState, useCallback } from 'react';

const useConfirm = () => {
  const [state, setState] = useState({ isOpen: false, resolve: null, options: {} });

  const confirm = useCallback((options = {}) => {
    return new Promise((resolve) => {
      setState({ isOpen: true, resolve, options });
    });
  }, []);

  const handleConfirm = useCallback(() => {
    state.resolve?.(true);
    setState({ isOpen: false, resolve: null, options: {} });
  }, [state.resolve]);

  const handleCancel = useCallback(() => {
    state.resolve?.(false);
    setState({ isOpen: false, resolve: null, options: {} });
  }, [state.resolve]);

  return {
    isOpen: state.isOpen,
    options: state.options,
    confirm,
    handleConfirm,
    handleCancel,
  };
};

export default useConfirm;
