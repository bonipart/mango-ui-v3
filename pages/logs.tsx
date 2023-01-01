import { useEffect, useRef, useState } from 'react'
import Input from '../components/Input'
/* import Label from "../components/Input"; */
/* import Button from "../components/Button" */
import LinkButton from '../components/Button'
/* import abbreviateAddress from "../utils"; */
import { Connection, PublicKey } from '@solana/web3.js'
import Loading from '../components/Loading'
import {
  MangoAccount,
  MangoAccountLayout,
} from '@blockworks-foundation/mango-client'

const MANGO = new PublicKey('mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68')
const SYSTEM = new PublicKey('11111111111111111111111111111111')

type MarginAccount = {
  mango_account: string
}
const getAccountInfo = async (pk: PublicKey) => {
  const ankrEndpoint = 'https://rpc.ankr.com/solana'
  const connection = new Connection(ankrEndpoint, 'confirmed')
  const accountInfo = await connection.getAccountInfo(pk, 'confirmed')

  return accountInfo
}

const fetchAccounts = async (address: string) => {
  const walletAccountsEndpoint =
    'https://mango-transaction-log.herokuapp.com/v3/user-data/wallet-mango-accounts'
  const response = await fetch(walletAccountsEndpoint + '?wallet-pk=' + address)
  const data: [MarginAccount] = await response.json()

  if (!Array.isArray(data)) return []

  const accounts = data.map((account) => account.mango_account)

  return accounts
}

const getMarginAccounts = async (address: string): Promise<string[]> => {
  const pk = new PublicKey(address)
  const accountInfo = await getAccountInfo(pk)
  const owner = accountInfo?.owner

  if (owner?.equals(SYSTEM)) {
    const marginAccounts = await fetchAccounts(address)

    return marginAccounts
  } else if (owner?.equals(MANGO)) {
    const data = accountInfo?.data
    const layout = MangoAccountLayout.decode(data)
    const mangoAccount = new MangoAccount(pk, layout)
    const owner = mangoAccount.owner
    const marginAccounts = await fetchAccounts(owner.toString())

    return marginAccounts
  } else {
    return []
  }
}

const validateAddress = (address: string): boolean => {
  try {
    const pubKey = new PublicKey(address)
    const isValid = PublicKey.isOnCurve(pubKey)
    return isValid
  } catch {
    return false
  }
}

const shortenAddress = (address: string) => {
  const head = address.slice(0, 5)
  const tail = address.slice(-5)
  const result = head + '...' + tail

  return result
}

const ArrowDownTrayIcon = (): JSX.Element => {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={1.5}
      stroke="currentColor"
      className="h-6 w-6"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3"
      />
    </svg>
  )
}

type ClearAddressBtnProps = {
  onClick: () => void
}

const ClearAddressBtn = ({ onClick }: ClearAddressBtnProps): JSX.Element => {
  return (
    <button onClick={onClick}>
      <svg
        xmlns="http://www.w3.org/2000/svg"
        fill="none"
        viewBox="0 0 24 24"
        strokeWidth={1.5}
        stroke="currentColor"
        className="h-6 w-6"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M6 18L18 6M6 6l12 12"
        />
      </svg>
    </button>
  )
}

type AddressInputProps = {
  address: string
  setAddress: (v: string) => void
}

const AddressInput = ({
  address,
  setAddress,
}: AddressInputProps): JSX.Element => {
  return (
    <Input
      type={'string'}
      onChange={(e) => setAddress(e.target.value)}
      value={address}
      suffix={
        address.length > 0 ? (
          <ClearAddressBtn
            onClick={() => {
              setAddress('')
            }}
          />
        ) : null
      }
    />
  )
}

type LogsDLBtnProps = {
  address: string
}

const LogDLBtn = ({ address }: LogsDLBtnProps): JSX.Element => {
  const shortAddress = address.slice(0, 5) + '...' + address.slice(-5)

  return (
    <LinkButton className="w-full">
      <div className="flex items-center">
        <div className="flex-1 text-center">{shortAddress}</div>
        <ArrowDownTrayIcon />
      </div>
    </LinkButton>
  )
}

export default function Logs() {
  const [address, setAddress] = useState('')
  const [marginAccounts, setMarginAccounts] = useState<string[]>([])
  const [isValidAddress, setIsValidAddress] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const prevAddress = useRef('')

  useEffect(() => {
    const isValid = validateAddress(address)

    if (!isValid) {
      prevAddress.current = ''
      setIsValidAddress(false)
      setMarginAccounts([])
      return
    }

    if (prevAddress.current === address) {
      return
    }

    prevAddress.current = address
    setIsValidAddress(true)
    setIsFetching(true)
    getMarginAccounts(address).then((accounts) => {
      setIsFetching(false)
      setMarginAccounts(accounts)
    })
  }, [address, JSON.stringify(marginAccounts)])

  // const clearAddress = () => {
  //     setAddress('')
  // }

  return (
    <div className="grid-rows-10 grid min-h-screen pt-6">
      <div className="flex flex-col">
        <div className="flex flex-col">
          <h1>Logs</h1>
          <div className="flex flex-col items-center">
            {!isValidAddress ? (
              <p className="">Enter a valid address to show available logs.</p>
            ) : null}
            <div className="w-full md:w-1/2 xl:w-1/3">
              <AddressInput address={address} setAddress={setAddress} />
            </div>
          </div>
        </div>

        <div className="flex-1">
          <div>
            <div>isValidAddress = {JSON.stringify(isValidAddress)}</div>
            <div>marginAccounts.length = {marginAccounts.length}</div>
          </div>
          <div className="flex justify-center">
            <div className="w-4/5 p-2 md:w-3/4 md:px-0  xl:w-1/3">
              {isValidAddress && marginAccounts.length < 1 ? (
                <div>
                  {isFetching ? (
                    <div className="flex justify-center">
                      <Loading className="m-10 h-10 w-10" />
                    </div>
                  ) : null}
                </div>
              ) : (
                <div>
                  {isValidAddress ? (
                    <div>
                      <div className="py-4">
                        Found {marginAccounts.length} logs for{' '}
                        {shortenAddress(address)}
                      </div>
                      <div className="grid grid-cols-1 justify-items-center gap-x-2 gap-y-2 md:grid-cols-2 ">
                        {marginAccounts.map((account) => {
                          return <LogDLBtn key={account} address={account} />
                        })}
                      </div>
                    </div>
                  ) : null}
                </div>
              )}
              {/*{(isValidAddress && marginAccounts.length < 1) ?*/}
              {/*    {*/}
              {/*    isFetching ?*/}
              {/*            <div className="flex justify-center">*/}
              {/*                <Loading className="m-10 h-10 w-10"/>*/}
              {/*            </div>*/}
              {/*            : null*/}
              {/*    }*/}
              {/*    : <div>*/}
              {/*        <div className="py-4 ">*/}
              {/*            Found {marginAccounts.length} logs for {shortenAddress(address)}*/}
              {/*        </div>*/}
              {/*        <div*/}
              {/*            className="grid grid-cols-1 justify-items-center gap-x-2 gap-y-2 md:grid-cols-2 ">*/}
              {/*            {marginAccounts.map(account => {*/}
              {/*                return <LogDLBtn key={account} address={account}/>*/}
              {/*            })}*/}

              {/*        </div>*/}
              {/*    </div>*/}
              {/*}*/}

              {/* {isValidAddress && !isFetching ?

                  : null
                  }
                  <div className="grid grid-cols-1 justify-items-center gap-x-2 gap-y-2 md:grid-cols-2 ">
                  {addys.map((addy) => (
                  <LogDLBtn key={addy} address={addy} />
                  ))}
                  </div>
                */}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
