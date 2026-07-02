export async function uploadAsset(file: ArrayBuffer, type: string) {
    try {
        const response = await fetch(process.env.HEYGEN_UPLOAD_ASSET!, {
            method: "POST",
            headers: {
                "Content-Type": type,
                "X-API-KEY": process.env.HEYGEN_API_KEY!,
            },
            body: file,
        });
        const data = await response.json();
        return data;
    } catch (error) {
        console.error("Error uploading file:", error);
        return null;
    }
}
