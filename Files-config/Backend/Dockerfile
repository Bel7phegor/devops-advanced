## build stage ##
FROM mcr.microsoft.com/dotnet/sdk:6.0 AS build
WORKDIR /app

COPY *.csproj .
RUN dotnet --version && dotnet restore
COPY . .

RUN dotnet publish -c Release -o /app/publish

## run stage ##
FROM mcr.microsoft.com/dotnet/aspnet:6.0
WORKDIR /run

RUN adduser -D onlineshop
COPY --from=build --chown=onlineshop:onlineshop /app/publish /run
USER onlineshop
EXPOSE 80
EXPOSE 443

ENTRYPOINT ["dotnet", "backend.dll"]
