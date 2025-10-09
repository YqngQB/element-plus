import consola from 'consola'
import chalk from 'chalk'
import { errorAndExit, getWorkspacePackages } from '@element-plus/build-utils'

import type { Project } from '@pnpm/find-workspace-packages'

async function main() {
  const tagVersion = process.env.TAG_VERSION
  const gitHead = process.env.GIT_HEAD

  if (!tagVersion || !gitHead) {
    errorAndExit(new Error('No tag version or git head were found'))
  }

  // 生成自定义版本号
  const customVersion = tagVersion.startsWith('v')
    ? `${tagVersion.slice(1)}-creso.${Date.now()}`
    : `${tagVersion}-creso.${Date.now()}`

  consola.log(chalk.cyan('Start updating version for private registry'))
  consola.log(chalk.cyan(`Custom version: ${customVersion}`))

  const pkgs = Object.fromEntries(
    (await getWorkspacePackages()).map((pkg) => [pkg.manifest.name!, pkg])
  )

  // 获取需要更新的包
  const elementPlus = pkgs['element-plus'] || pkgs['@creso/element-plus']
  const eslintConfig = pkgs['@element-plus/eslint-config']
  const metadata = pkgs['@element-plus/metadata']

  const writeVersion = async (project: Project, packageName: string) => {
    await project.writeProjectManifest({
      ...project.manifest,
      name: packageName, // 更新包名
      version: customVersion,
      gitHead,
    } as any)
  }

  try {
    await writeVersion(elementPlus, '@creso/element-plus')
    await writeVersion(eslintConfig, '@creso/eslint-config')
    await writeVersion(metadata, '@creso/metadata')
  } catch (err: any) {
    errorAndExit(err)
  }

  consola.success(chalk.green(`Private version updated to ${customVersion}`))
}

main()
