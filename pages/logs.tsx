import { useEffect, useRef, useState } from 'react'
import Input from '../components/Input'
import LinkButton from '../components/Button'
import Loading from '../components/Loading'
import { AccountInfo, Connection, PublicKey } from '@solana/web3.js'
import {
  MangoAccount,
  MangoAccountLayout,
} from '@blockworks-foundation/mango-client'

const MANGO_V3 = new PublicKey('mv3ekLzLbnVPNxjSKvqBpU3ZeZXPQdEC3bp5MDEBG68')
const SYSTEM_PROGRAM = new PublicKey('11111111111111111111111111111111')

const fetchAccounts = async (address: string): Promise<string[]> => {
  const walletAccountsBaseURL =
    'https://mango-transaction-log.herokuapp.com/v3/user-data/wallet-mango-accounts'
  const response = await fetch(walletAccountsBaseURL + '?wallet-pk=' + address)
  const data = await response.json()

  if (!Array.isArray(data)) return []

  const accounts = data.map((account) => account.mango_account)

  return accounts
}

const getAccountInfo = async (
  pubKey: PublicKey
): Promise<AccountInfo<Buffer> | null> => {
  const ankrEndpoint = 'https://rpc.ankr.com/solana'
  const connection = new Connection(ankrEndpoint, 'confirmed')

  let accountInfo
  try {
    accountInfo = connection.getAccountInfo(pubKey, 'confirmed')
  } catch (e) {
    // TODO: Display error message
    return null
  }

  return accountInfo
}

const getMangoAccounts = async (address: string): Promise<string[]> => {
  const pubKey = new PublicKey(address)
  const accountInfo = await getAccountInfo(pubKey)
  const owner = accountInfo?.owner

  if (owner?.equals(SYSTEM_PROGRAM)) {
    const mangoAccounts = await fetchAccounts(address)

    return mangoAccounts
  } else if (owner?.equals(MANGO_V3)) {
    const data = accountInfo?.data

    let layout
    try {
      layout = MangoAccountLayout.decode(data)
    } catch {
      return []
    }

    const mangoAccount = new MangoAccount(pubKey, layout)
    const owner = mangoAccount.owner
    const mangoAccounts = await fetchAccounts(owner.toString())

    return mangoAccounts
  } else {
    return []
  }
}

const isSolanaAddress = (address: string): boolean => {
  try {
    new PublicKey(address)
    return true
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
  isValid: boolean
  setAddress: (v: string) => void
}

const AddressInput = ({
  address,
  isValid,
  setAddress,
}: AddressInputProps): JSX.Element => {
  const input = useRef<HTMLInputElement>(null)
  useEffect(() => {
    if (input.current) {
      input.current.focus()
    }
  }, [])

  console.log('inputRef = ', input)

  return (
    <Input
      ref={input}
      type={'string'}
      onChange={(e) => setAddress(e.target.value)}
      value={address}
      disabled={isValid}
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
  const shortAddress = shortenAddress(address)
  const logURL = 'https://mango-v3.s3.amazonaws.com/' + address + '_data.zip'

  return (
    <a href={logURL} className="w-full">
      <LinkButton className="w-full">
        <div className="flex items-center">
          <div className="flex-1 text-center">{shortAddress}</div>
          <ArrowDownTrayIcon />
        </div>
      </LinkButton>
    </a>
  )
}

export default function Logs() {
  const [address, setAddress] = useState('')
  const [mangoAccounts, setMarginAccounts] = useState<string[]>([])
  const [isValidAddress, setIsValidAddress] = useState(false)
  const [isFetching, setIsFetching] = useState(false)
  const prevAddress = useRef('')

  useEffect(() => {
    const isValid = isSolanaAddress(address)

    if (!isValid) {
      prevAddress.current = ''
      setIsFetching(false)
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
    getMangoAccounts(address).then((accounts) => {
      setIsFetching(false)
      setMarginAccounts(accounts)
    })
  }, [address, JSON.stringify(mangoAccounts)])

  return (
    <div className="grid-rows-10 mt-6 grid min-h-screen">
      <div className="flex flex-col">
        <div className="flex flex-col">
          <h1>Logs</h1>
          <div className="flex flex-col items-center pt-4">
            {!isValidAddress && (
              <p>Enter a valid address to show available logs.</p>
            )}
            <div className="w-full md:w-[70%] xl:w-1/3">
              <AddressInput
                address={address}
                isValid={isValidAddress}
                setAddress={setAddress}
              />
              {isValidAddress && !isFetching && (
                <p className="mt-6 self-start">
                  Found{' '}
                  <span className="font-bold">{mangoAccounts.length}</span> logs
                  for {shortenAddress(address)}:
                </p>
              )}
            </div>
          </div>
        </div>

        <div className="mt-2 flex-1">
          <div className="flex justify-center">
            <div className="w-[70%] md:px-0 xl:w-1/3">
              {isFetching && (
                <div className="flex justify-center">
                  <Loading className="m-10 h-10 w-10" />
                </div>
              )}
              {isValidAddress && !isFetching && (
                <div>
                  <div className="grid grid-cols-1 justify-items-center gap-x-2 gap-y-2 md:grid-cols-2 ">
                    {mangoAccounts.map((account) => {
                      return <LogDLBtn key={account} address={account} />
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
