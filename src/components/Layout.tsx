import { NavLink, Outlet } from 'react-router-dom';
import styles from './Layout.module.scss';

const Layout: React.FC = () => {
  return (
    <div className={styles.layout}>
      <header className={styles.header}>
        <div className={styles.inner}>
          <NavLink to="/" className={styles.logo}>
            🐾 SkillAgent
          </NavLink>
          <nav className={styles.nav}>
            <NavLink
              to="/"
              end
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.icon}>📖</span>
              <span>学习指南</span>
            </NavLink>
            <NavLink
              to="/agent"
              className={({ isActive }) =>
                `${styles.link} ${isActive ? styles.active : ''}`
              }
            >
              <span className={styles.icon}>🤖</span>
              <span>Agent 实战</span>
            </NavLink>
          </nav>
        </div>
      </header>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
};

export default Layout;
