export interface BuilderOptions {
    project: string,
    arch: string,
    commitish: string,
    extraCmakeArgs: string,
    useVcpkg: boolean
}
