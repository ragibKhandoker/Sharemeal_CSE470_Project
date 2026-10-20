import React, { useCallback, useEffect, useState } from 'react';
import ReceiverLayout from '../../components/receiver/ReceiverLayout';
import Notice from '../../components/common/Notice';
import { useAuth } from '../../context/AuthContext';
import walletService from '../../services/walletService';
import WalletBalanceCard from '../../components/wallet/WalletBalanceCard';
import TransactionList from '../../components/wallet/TransactionList';
import AddMoneyModal from '../../components/wallet/AddMoneyModal';
import PayNgoModal from '../../components/wallet/PayNgoModal';
import { Card, colors, Pagination, Spinner } from '../../components/wallet/walletUi';

const HISTORY_PAGE_SIZE = 10;

export default function Wallet() {
  const { token, user } = useAuth();
  const [wallet, setWallet] = useState(null);
  const [walletError, setWalletError] = useState('');
  const [history, setHistory] = useState({ items: [], page: 1, pages: 0, total: 0 });
  const [historyLoading, setHistoryLoading] = useState(true);
  const [historyError, setHistoryError] = useState('');
  const [modal, setModal] = useState(null);

  const loadWallet = useCallback(async () => {
    if (!token) return;
    try {
      const response = await walletService.getWallet(token);
      setWallet(response.data);
      setWalletError('');
    } catch (error) {
      setWalletError(error.message);
    }
  }, [token]);

  const loadHistory = useCallback(async (page) => {
    if (!token) return;
    setHistoryLoading(true);
    try {
      const response = await walletService.getTransactions(token, page, HISTORY_PAGE_SIZE);
      setHistory({ items: response.data, ...response.pagination });
      setHistoryError('');
    } catch (error) {
      setHistoryError(error.message);
    } finally {
      setHistoryLoading(false);
    }
  }, [token]);

  useEffect(() => { loadWallet(); loadHistory(1); }, [loadWallet, loadHistory]);

  const refreshAll = useCallback(() => { loadWallet(); loadHistory(1); }, [loadWallet, loadHistory]);

  const provider = wallet?.payment_provider;
  const isVerified = user?.verification_status === 'verified';
  const addDisabledReason = provider && !provider.available ? 'Top-ups are not available on this server yet.' : '';
  const payDisabledReason = !isVerified
    ? 'Verify your receiver profile to pay NGOs.'
    : wallet?.balance_paisa <= 0 ? 'Add money to your wallet first.' : '';

  return (
    <ReceiverLayout title="Wallet">
      <div style={{ maxWidth: 980, margin: '0 auto', display: 'grid', gap: 16 }}>
        <header>
          <h2 style={{ margin: 0, color: colors.ink }}>My wallet</h2>
          <p style={{ margin: '6px 0 0', color: colors.muted }}>Add money and pay verified NGOs directly from your ShareMeal balance.</p>
        </header>

        {walletError && <Notice tone="error" title="Could not load your wallet" onClose={() => setWalletError('')}>{walletError}</Notice>}

        {provider?.simulated && (
          <Notice tone="warning" title="Sandbox mode — test money only">
            Real payments are not connected yet. Money added here is simulated and is marked <strong>TEST MONEY</strong>.
            NGO payments are recorded in ShareMeal&apos;s ledger only; no real money is transferred.
          </Notice>
        )}
        {provider && !provider.available && (
          <Notice tone="info" title="Top-ups unavailable">
            The payment gateway is not configured on this server, so you can&apos;t add money right now.
          </Notice>
        )}
        {wallet && !isVerified && (
          <Notice tone="info" title="Verification needed" action={{ to: '/receiver/profile', label: 'Go to profile' }}>
            You can add money now, but you need a verified receiver profile before paying an NGO.
          </Notice>
        )}

        {!wallet && !walletError ? <Card><Spinner label="Loading your wallet…" /></Card> : wallet && (
          <div style={{ display: 'grid', gap: 16, gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 320px), 1fr))', alignItems: 'start' }}>
            <WalletBalanceCard
              wallet={wallet}
              onAddMoney={() => setModal('add')}
              onPayNgo={() => setModal('pay')}
              addDisabledReason={addDisabledReason}
              payDisabledReason={payDisabledReason}
            />
            <Card>
              <h3 style={{ margin: '0 0 12px', color: colors.ink, fontSize: 17 }}>Recent transactions</h3>
              <TransactionList items={wallet.recent_transactions} emptyText="Your recent activity will appear here." />
            </Card>
          </div>
        )}

        <Card>
          <div style={{ display: 'flex', alignItems: 'baseline', justifyContent: 'space-between', gap: 8, flexWrap: 'wrap', marginBottom: 12 }}>
            <h3 style={{ margin: 0, color: colors.ink, fontSize: 17 }}>Transaction history</h3>
            {history.total > 0 && <span style={{ color: colors.muted, fontSize: 13 }}>{history.total} total</span>}
          </div>
          {historyError && <div style={{ marginBottom: 12 }}><Notice tone="error" onClose={() => setHistoryError('')}>{historyError}</Notice></div>}
          {historyLoading && history.items.length === 0 ? <Spinner label="Loading history…" /> : (
            <div style={{ opacity: historyLoading ? 0.6 : 1, transition: 'opacity 0.2s' }}>
              <TransactionList items={history.items} emptyText="No transactions yet. Add money to get started." />
            </div>
          )}
          <Pagination page={history.page} pages={history.pages} disabled={historyLoading} onChange={loadHistory} />
        </Card>
      </div>

      {modal === 'add' && (
        <AddMoneyModal token={token} provider={provider} onClose={() => setModal(null)} onCompleted={refreshAll} />
      )}
      {modal === 'pay' && wallet && (
        <PayNgoModal token={token} balancePaisa={wallet.balance_paisa} onClose={() => setModal(null)} onCompleted={refreshAll} />
      )}
    </ReceiverLayout>
  );
}
