// Email is now handled by system Gmail on the backend.
// This context is kept as a no-op so existing imports don't break.
import { createContext, useContext } from 'react'

const EmailSetupContext = createContext()

export const useEmailSetup = () => useContext(EmailSetupContext)

export const EmailSetupProvider = ({ children }) => {
  // requireEmailSetup: just runs the action directly — no popup needed
  const requireEmailSetup = (action) => action()

  return (
    <EmailSetupContext.Provider value={{ hasEmailSetup: true, requireEmailSetup, showEmailSetup: () => {} }}>
      {children}
    </EmailSetupContext.Provider>
  )
}
