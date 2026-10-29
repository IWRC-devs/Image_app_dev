import type { Alert } from 'react-native';

export const showAlert: typeof Alert.alert = (title, message, buttons) => {
  const text = [title, message].filter(Boolean).join('\n\n');
  if (buttons && buttons.length > 1) {
    const action = buttons.find((button) => button.style !== 'cancel');
    if (window.confirm(text)) action?.onPress?.();
    else buttons.find((button) => button.style === 'cancel')?.onPress?.();
  } else {
    window.alert(text);
    buttons?.[0]?.onPress?.();
  }
};
