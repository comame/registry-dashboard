async function main() {
    const appEl = document.getElementById('app')

    const repos = (await getCalalog()).repositories

    for (const repo of repos) {
        let htmlStr = `<ul>`
        /** @type {string[]} */
        const tags = (await getTags(repo)).tags?.sort()
        if (!tags) continue
        htmlStr += (await Promise.all(tags.map(async (tag) => {
            const ref = `${repo}:${tag}`
            const digest = await describeManifestDigest(repo, tag)
            return `<li><button class='delete-button' ref=${ref} digest=${digest}>DELETE</button>${ref}@${digest.slice(7, 7 + 12)}</li>`
        }))).join('')
        htmlStr += '</ul>'

        appEl.innerHTML += htmlStr
    }

    const deleteButtons = Array.from(document.getElementsByClassName('delete-button'))

    for (const deleteButton of deleteButtons) {
        deleteButton.addEventListener('click', async e => {
            if (!confirm('Delete?')) return
            const button = e.currentTarget
            const ref = button.getAttribute('ref')
            const [ repo, tag ] = ref.split(':')
            const digest = button.getAttribute('digest')
            await deleteManifest(repo, digest)
            location.reload()
        })
    }
}

main()

async function getCalalog() {
    return fetch('https://registry.comame.dev/v2/_catalog', {
        credentials: 'include',
    }).then(res => res.json()).then(json => {
        handleError(json)
        return json
    })
}

async function getTags(name) {
    return fetch(`https://registry.comame.dev/v2/${name}/tags/list`, {
        credentials: 'include'
    }).then(res => res.json()).then(json => {
        handleError(json)
        return json
    })
}

async function describeManifestDigest(name, tag) {
    const response = await fetch(`https://registry.comame.dev/v2/${name}/manifests/${tag}`, {
        credentials: 'include',
        headers: {
            Accept: 'application/vnd.docker.distribution.manifest.v2+json'
        }
    })

    await response.json().then(json => {
        handleError(json)
    })

    return response.headers.get('docker-content-digest')
}

async function deleteManifest(name, digest) {
    const response = await fetch(`https://registry.comame.dev/v2/${name}/manifests/${digest}`, {
        credentials: 'include',
        method: 'DELETE',
        headers: {
            Accept: 'application/vnd.docker.distribution.manifest.v2+json'
        }
    })
}

function handleError(responseJsonFromRegistry) {
    const error = responseJsonFromRegistry.errors?.[0]
    if (error) {
        alert(error.message)
        if (error.code == 'UNAUTHORIZED') {
            alert('You will be redirected to /v2/_catalog. Please come back when you authenticated.')
            location.href = 'https://registry.comame.dev/v2/_catalog'
        }
        throw ''
    }
}
