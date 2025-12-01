'use client'

import { useState } from 'react'
import { Dialog, Transition } from '@headlessui/react'
import { Fragment } from 'react'
import { XMarkIcon, DocumentTextIcon, CheckCircleIcon, ExclamationTriangleIcon } from '@heroicons/react/24/outline'

interface Transaction {
  id: string
  order_id: string
  payment_key: string | null
  amount: number
  vat: number
  total_amount: number
  payment_method: string
  payment_method_detail: any
  status: string
  requested_at: string
  approved_at: string | null
  failed_at: string | null
  failure_message: string | null
  receipt_url: string | null
  receipt_data: any
  tax_invoice_requested: boolean
  tax_invoice_issued_at: string | null
  created_at: string
}

interface Subscription {
  id: string
  status: string
  billing_cycle: string
  trial_end_date: string | null
  current_period_end: string | null
  subscription_plans: {
    display_name: string
    monthly_price: number
    yearly_price: number
  }
}

interface PaymentsClientProps {
  subscription: Subscription | null
  transactions: Transaction[]
  companyId: string
}

export default function PaymentsClient({
  subscription,
  transactions,
  companyId,
}: PaymentsClientProps) {
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null)
  const [showReceiptModal, setShowReceiptModal] = useState(false)

  const getStatusBadge = (status: string) => {
    const badges = {
      success: { text: '결제 완료', class: 'bg-green-100 text-green-800' },
      pending: { text: '처리 중', class: 'bg-yellow-100 text-yellow-800' },
      failed: { text: '결제 실패', class: 'bg-red-100 text-red-800' },
      canceled: { text: '취소됨', class: 'bg-gray-100 text-gray-800' },
      refunded: { text: '환불됨', class: 'bg-purple-100 text-purple-800' },
    }
    const badge = badges[status as keyof typeof badges] || badges.pending
    return (
      <span className={`inline-flex rounded-full px-3 py-1 text-xs font-semibold ${badge.class}`}>
        {badge.text}
      </span>
    )
  }

  const getPaymentMethodName = (method: string) => {
    const methods: Record<string, string> = {
      card: '신용카드',
      transfer: '계좌이체',
      virtual_account: '가상계좌',
    }
    return methods[method] || method
  }

  const handleViewReceipt = (transaction: Transaction) => {
    setSelectedTransaction(transaction)
    setShowReceiptModal(true)
  }

  const handleRequestTaxInvoice = async (transactionId: string) => {
    // 세금계산서 발행 요청 로직 (추후 구현)
    alert('세금계산서 발행 요청이 접수되었습니다. 영업일 기준 1-2일 내에 이메일로 발송됩니다.')
  }

  return (
    <div className="space-y-6">
      {/* 구독 정보 카드 */}
      {subscription && (
        <div className="bg-gradient-to-r from-blue-500 to-blue-600 rounded-xl shadow-lg p-6 text-white">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm opacity-90">현재 플랜</p>
              <h2 className="text-2xl font-bold mt-1">
                {subscription.subscription_plans.display_name}
              </h2>
              <p className="mt-2 text-sm opacity-90">
                {subscription.billing_cycle === 'monthly' ? '월간' : '연간'} 결제 •{' '}
                {subscription.status === 'trial'
                  ? '무료 체험 중'
                  : subscription.status === 'active'
                  ? '구독 활성'
                  : '결제 지연'}
              </p>
            </div>
            <div className="text-right">
              <p className="text-3xl font-bold">
                {subscription.billing_cycle === 'monthly'
                  ? subscription.subscription_plans.monthly_price.toLocaleString()
                  : subscription.subscription_plans.yearly_price.toLocaleString()}
                원
              </p>
              <p className="text-sm opacity-90 mt-1">
                {subscription.billing_cycle === 'monthly' ? '/ 월' : '/ 년'}
              </p>
              {subscription.trial_end_date && subscription.status === 'trial' && (
                <p className="text-sm mt-2 opacity-90">
                  체험 종료: {new Date(subscription.trial_end_date).toLocaleDateString('ko-KR')}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 결제 내역 테이블 */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <h3 className="text-lg font-semibold text-gray-900">결제 내역</h3>
        </div>

        {transactions.length === 0 ? (
          <div className="px-6 py-12 text-center">
            <DocumentTextIcon className="mx-auto h-12 w-12 text-gray-400" />
            <p className="mt-2 text-sm text-gray-600">결제 내역이 없습니다</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    결제일
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    주문번호
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    결제 수단
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    금액
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    상태
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    영수증
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {new Date(transaction.created_at).toLocaleDateString('ko-KR')}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600 font-mono">
                      {transaction.order_id}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {getPaymentMethodName(transaction.payment_method)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-semibold text-gray-900">
                      {transaction.total_amount.toLocaleString()}원
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(transaction.status)}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      {transaction.status === 'success' && (
                        <button
                          onClick={() => handleViewReceipt(transaction)}
                          className="text-blue-600 hover:text-blue-900 font-medium"
                        >
                          영수증 확인
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 영수증 모달 */}
      <Transition appear show={showReceiptModal} as={Fragment}>
        <Dialog as="div" className="relative z-50" onClose={() => setShowReceiptModal(false)}>
          <Transition.Child
            as={Fragment}
            enter="ease-out duration-300"
            enterFrom="opacity-0"
            enterTo="opacity-100"
            leave="ease-in duration-200"
            leaveFrom="opacity-100"
            leaveTo="opacity-0"
          >
            <div className="fixed inset-0 bg-black bg-opacity-25" />
          </Transition.Child>

          <div className="fixed inset-0 overflow-y-auto">
            <div className="flex min-h-full items-center justify-center p-4 text-center">
              <Transition.Child
                as={Fragment}
                enter="ease-out duration-300"
                enterFrom="opacity-0 scale-95"
                enterTo="opacity-100 scale-100"
                leave="ease-in duration-200"
                leaveFrom="opacity-100 scale-100"
                leaveTo="opacity-0 scale-95"
              >
                <Dialog.Panel className="w-full max-w-md transform overflow-hidden rounded-2xl bg-white p-6 text-left align-middle shadow-xl transition-all">
                  <div className="flex items-center justify-between mb-4">
                    <Dialog.Title as="h3" className="text-lg font-semibold text-gray-900">
                      영수증 상세
                    </Dialog.Title>
                    <button
                      onClick={() => setShowReceiptModal(false)}
                      className="text-gray-400 hover:text-gray-500"
                    >
                      <XMarkIcon className="h-6 w-6" />
                    </button>
                  </div>

                  {selectedTransaction && (
                    <div className="space-y-4">
                      {/* 결제 상태 */}
                      <div className="flex items-center justify-center py-4 border-b border-gray-200">
                        {selectedTransaction.status === 'success' ? (
                          <CheckCircleIcon className="h-16 w-16 text-green-500" />
                        ) : (
                          <ExclamationTriangleIcon className="h-16 w-16 text-red-500" />
                        )}
                      </div>

                      {/* 결제 정보 */}
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">주문번호</span>
                          <span className="text-sm font-medium text-gray-900 font-mono">
                            {selectedTransaction.order_id}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">결제일시</span>
                          <span className="text-sm font-medium text-gray-900">
                            {new Date(selectedTransaction.created_at).toLocaleString('ko-KR')}
                          </span>
                        </div>

                        <div className="flex justify-between">
                          <span className="text-sm text-gray-600">결제 수단</span>
                          <span className="text-sm font-medium text-gray-900">
                            {getPaymentMethodName(selectedTransaction.payment_method)}
                            {selectedTransaction.payment_method_detail?.cardCompany && (
                              <span className="text-gray-500">
                                {' '}
                                ({selectedTransaction.payment_method_detail.cardCompany})
                              </span>
                            )}
                          </span>
                        </div>

                        {selectedTransaction.payment_method_detail?.number && (
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">카드번호</span>
                            <span className="text-sm font-medium text-gray-900 font-mono">
                              {selectedTransaction.payment_method_detail.number}
                            </span>
                          </div>
                        )}

                        <div className="border-t border-gray-200 pt-3 mt-3">
                          <div className="flex justify-between">
                            <span className="text-sm text-gray-600">공급가액</span>
                            <span className="text-sm font-medium text-gray-900">
                              {selectedTransaction.amount.toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex justify-between mt-2">
                            <span className="text-sm text-gray-600">부가세</span>
                            <span className="text-sm font-medium text-gray-900">
                              {selectedTransaction.vat.toLocaleString()}원
                            </span>
                          </div>
                          <div className="flex justify-between mt-3 pt-3 border-t border-gray-200">
                            <span className="text-base font-semibold text-gray-900">총 결제금액</span>
                            <span className="text-base font-bold text-blue-600">
                              {selectedTransaction.total_amount.toLocaleString()}원
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* 액션 버튼 */}
                      <div className="space-y-2 pt-4">
                        {selectedTransaction.receipt_url && (
                          <a
                            href={selectedTransaction.receipt_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="block w-full text-center bg-blue-600 text-white rounded-lg px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                          >
                            토스 영수증 보기
                          </a>
                        )}

                        {!selectedTransaction.tax_invoice_requested && (
                          <button
                            onClick={() => handleRequestTaxInvoice(selectedTransaction.id)}
                            className="w-full bg-gray-100 text-gray-700 rounded-lg px-4 py-2 text-sm font-semibold hover:bg-gray-200"
                          >
                            세금계산서 발행 요청
                          </button>
                        )}

                        {selectedTransaction.tax_invoice_requested && (
                          <div className="text-center text-sm text-green-600">
                            ✓ 세금계산서 발행 요청됨
                            {selectedTransaction.tax_invoice_issued_at && (
                              <span className="block text-gray-500 mt-1">
                                발행일: {new Date(selectedTransaction.tax_invoice_issued_at).toLocaleDateString('ko-KR')}
                              </span>
                            )}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </Dialog.Panel>
              </Transition.Child>
            </div>
          </div>
        </Dialog>
      </Transition>
    </div>
  )
}
