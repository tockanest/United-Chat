use futures::{SinkExt, StreamExt};
use std::collections::HashSet;
use std::sync::Arc;
use tokio::net::TcpListener;
use tokio::sync::{watch, Mutex};
use tokio_tungstenite::accept_async;
use tokio_tungstenite::tungstenite::protocol::Message;

type Tx = tokio::sync::mpsc::UnboundedSender<Message>;
type Rx = tokio::sync::mpsc::UnboundedReceiver<Message>;

pub struct WebSocketServer {
    clients: Arc<Mutex<Vec<Tx>>>,
    client_addresses: Arc<Mutex<HashSet<String>>>,
    shutdown_signal: watch::Sender<()>, // Added shutdown signal
}

impl WebSocketServer {
    pub fn new() -> Self {
        let (shutdown_signal, _) = watch::channel(());
        Self {
            clients: Arc::new(Mutex::new(Vec::new())),
            client_addresses: Arc::new(Mutex::new(HashSet::new())),
            shutdown_signal,
        }
    }

    pub async fn run(&self, addr: &str) -> Result<(), Box<dyn std::error::Error>> {
        let listener = TcpListener::bind(addr).await?;
        println!("WebSocket server running on {}", addr);

        let mut shutdown_receiver = self.shutdown_signal.subscribe();

        loop {
            tokio::select! {
                Ok((stream, addr)) = listener.accept() => {
                    println!("Accepted connection from {}", addr);
                    let addr_str = addr.to_string();
                    let mut client_addresses = self.client_addresses.lock().await;
                    if client_addresses.contains(&addr_str) {
                        eprintln!("Client already connected: {}", addr_str);
                        continue;
                    }
                    client_addresses.insert(addr_str.clone());

                    let ws_stream = accept_async(stream).await?;
                    let (tx, rx) = tokio::sync::mpsc::unbounded_channel();
                    self.clients.lock().await.push(tx);

                    let clients = Arc::clone(&self.clients);
                    let client_addresses = Arc::clone(&self.client_addresses);
                    tokio::spawn(Self::handle_connection(
                        ws_stream,
                        rx,
                        clients,
                        client_addresses,
                        addr_str,
                        shutdown_receiver.clone(), // Pass the shutdown receiver
                    ));
                },
                _ = shutdown_receiver.changed() => {
                    println!("Shutting down the WebSocket server...");
                    break;
                }
            }
        }
        Ok(())
    }

    async fn handle_connection(
        mut ws_stream: tokio_tungstenite::WebSocketStream<tokio::net::TcpStream>,
        mut rx: Rx,
        clients: Arc<Mutex<Vec<Tx>>>,
        client_addresses: Arc<Mutex<HashSet<String>>>,
        addr_str: String,
        mut shutdown_signal: watch::Receiver<()>, // Added shutdown signal receiver
    ) {
        loop {
            tokio::select! {
                Some(msg) = ws_stream.next() => {
                    if let Ok(msg) = msg {
                        if msg.is_close() {
                            break;
                        }
                    }
                }
                Some(msg) = rx.recv() => {
                    if let Err(e) = ws_stream.send(msg).await {
                        eprintln!("Error sending message: {}", e);
                        break;
                    }
                }
                _ = shutdown_signal.changed() => {
                    println!("Shutting down connection for {}", addr_str);
                    let _ = ws_stream.close(None).await; // Close the WebSocket connection
                    break;
                }
            }
        }

        let mut clients = clients.lock().await;
        clients.retain(|client| !client.is_closed());

        let mut client_addresses = client_addresses.lock().await;
        client_addresses.remove(&addr_str);
    }

    pub async fn broadcast(&self, msg: Message) {
        let clients = self.clients.lock().await;
        for client in clients.iter() {
            if let Err(e) = client.send(msg.clone()) {
                eprintln!("Error broadcasting message: {}", e);
            }
        }
    }

    pub async fn close(&self) {
        self.shutdown_signal.send(()).unwrap();
        let mut clients = self.clients.lock().await;
        clients.clear();
    }
}
