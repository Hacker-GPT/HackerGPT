export const getCryptoPaymentStatus = async (token: string) => {
  const url = process.env.NEXT_PUBLIC_CRYPTO_PAYMENT_STATUS || '';
  const res = await fetch(url, {
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
  });

  const data = await res.json();
  let status = '';

  if (data.status) {
    if (data.status === 'trialing') {
      status = 'You are currently on a free trial.';
    } else if (data.status === 'active') {
      status = 'Your subscription is active.';
    } else if (data.status === 'confirmation-pending') {
      status = 'Waiting for blockchain confirmation.';
    } else if (data.status === 'payment-failed') {
      status =
        'Blockchain confirmation failed. Please try again or contact support.';
    } else if (data.status === 'expired') {
      status = 'Your subscription has expired.';
    }

    if (data.ends_at) {
      if (data.status === 'expired') {
        status += ` It expired on ${data.ends_at.split('T')[0]}`;
      } else {
        status += ` Your subscription will end on ${
          data.ends_at.split('T')[0]
        }`;
      }
    }

    return status;
  } else {
    return data;
  }
};
