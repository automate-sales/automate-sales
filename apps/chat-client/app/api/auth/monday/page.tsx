import MondayClient from '../../../components/general/mondayClient'

export default async function Home(){
  return (
    <>
      <MondayClient />
      <div className='center'>
        <div style={{
            width: '50%',
            padding: '16px',
            fontSize: '20px',
            border: '1px solid',
            borderRadius: '3px',
            backgroundColor: 'inherit',
            textAlign: 'center',
          }}>Authenticating with monday.com</div>
      </div>
    </>
  )
}