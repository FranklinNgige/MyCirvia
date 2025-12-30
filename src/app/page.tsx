import Link from 'next/link';

const HomePage = () => (
  <section>
    <h1>MyCirvia</h1>
    <p>Welcome to the privacy-first community platform.</p>
    <div className="auth-links">
      <Link href="/auth/sign-in">Sign in</Link>
      <Link href="/auth/sign-up">Create account</Link>
    </div>
  </section>
);

export default HomePage;
