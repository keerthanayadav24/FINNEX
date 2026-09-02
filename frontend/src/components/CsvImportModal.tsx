import React, { useState } from 'react';
import { FileSpreadsheet, CheckCircle2, AlertTriangle, X, Upload } from 'lucide-react';
import { Account } from '../types';
import { csvService, CsvPreviewResponse } from '../services/csvService';
import { formatCurrency } from '../utils/formatters';

interface CsvImportModalProps {
  accounts: Account[];
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CsvImportModal: React.FC<CsvImportModalProps> = ({
  accounts,
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [accountId, setAccountId] = useState(accounts[0]?.id || '');
  const [csvText, setCsvText] = useState(
    `date,type,amount,merchant,category,description,tags\n2026-08-01,EXPENSE,450,Swiggy,Food & Dining,Dinner,"food,delivery"\n2026-08-02,INCOME,35000,Company Corp,Salary & Income,Monthly salary,"salary"`
  );
  const [preview, setPreview] = useState<CsvPreviewResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen) return null;

  const handlePreview = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await csvService.previewCsv(accountId || accounts[0]?.id, csvText);
      setPreview(res);
    } catch (err: any) {
      setError(err.message || 'Failed to preview CSV file');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirm = async () => {
    if (!preview || !preview.importToken) return;
    setImporting(true);
    setError('');
    try {
      await csvService.confirmImport(preview.accountId, preview.importToken);
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || 'Failed to confirm CSV import');
    } finally {
      setImporting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <div className="w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl space-y-6 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 flex items-center justify-center text-cyan-400">
              <FileSpreadsheet className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Import Transactions from CSV</h3>
              <p className="text-xs text-slate-400">Server-validated normalized CSV importer</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 text-slate-500 hover:text-slate-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs">{error}</div>}

        {!preview ? (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">Target Account</label>
              <select
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-white focus:outline-none focus:border-cyan-500 text-sm"
              >
                {accounts.map((acc) => (
                  <option key={acc.id} value={acc.id}>
                    {acc.name} ({formatCurrency(acc.currentBalance)})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-300 uppercase mb-1">CSV Text Content</label>
              <textarea
                rows={8}
                value={csvText}
                onChange={(e) => setCsvText(e.target.value)}
                placeholder="Paste date,type,amount,merchant,category,description,tags..."
                className="w-full p-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 font-mono text-xs focus:outline-none focus:border-cyan-500"
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handlePreview}
                disabled={loading}
                className="flex items-center gap-2 px-5 py-2 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-50"
              >
                <Upload className="w-4 h-4" /> {loading ? 'Validating CSV...' : 'Preview & Validate CSV'}
              </button>
            </div>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Summary Bar */}
            <div className="grid grid-cols-3 gap-4">
              <div className="p-4 rounded-xl bg-slate-950/80 border border-slate-800">
                <div className="text-xs text-slate-500 uppercase font-semibold">Total Rows</div>
                <div className="text-2xl font-bold text-white mt-1">{preview.totalRows}</div>
              </div>
              <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20">
                <div className="text-xs text-emerald-400 uppercase font-semibold flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Valid Rows
                </div>
                <div className="text-2xl font-bold text-emerald-400 mt-1">{preview.validCount}</div>
              </div>
              <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                <div className="text-xs text-amber-400 uppercase font-semibold flex items-center gap-1">
                  <AlertTriangle className="w-3.5 h-3.5" /> Invalid Rows
                </div>
                <div className="text-2xl font-bold text-amber-400 mt-1">{preview.invalidCount}</div>
              </div>
            </div>

            {/* Row Previews Table */}
            <div className="border border-slate-800 rounded-xl overflow-hidden max-h-60 overflow-y-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 font-semibold uppercase border-b border-slate-800">
                  <tr>
                    <th className="p-3">#</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Merchant</th>
                    <th className="p-3">Type</th>
                    <th className="p-3">Amount</th>
                    <th className="p-3">Category</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60">
                  {preview.previews.map((row) => (
                    <tr key={row.rowNumber} className={row.isValid ? 'hover:bg-slate-900/40' : 'bg-rose-950/20'}>
                      <td className="p-3 text-slate-500 font-mono">{row.rowNumber}</td>
                      <td className="p-3">
                        {row.isValid ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 font-medium">
                            Valid
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-rose-500/10 text-rose-400 border border-rose-500/20 font-medium">
                            {row.errors[0]}
                          </span>
                        )}
                      </td>
                      <td className="p-3 font-semibold text-white">{row.merchant || '—'}</td>
                      <td className="p-3 font-mono">{row.type}</td>
                      <td className="p-3 font-bold text-slate-200 font-mono">{formatCurrency(row.amount)}</td>
                      <td className="p-3 text-slate-400">{row.categoryName || 'Uncategorized'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => setPreview(null)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 text-sm font-semibold hover:bg-slate-700"
              >
                Back to Edit CSV
              </button>

              <button
                type="button"
                onClick={handleConfirm}
                disabled={importing || preview.validCount === 0}
                className="px-6 py-2.5 rounded-xl bg-cyan-500 text-slate-950 text-sm font-semibold hover:bg-cyan-400 disabled:opacity-50"
              >
                {importing ? 'Importing...' : `Confirm & Import ${preview.validCount} Valid Transactions`}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
